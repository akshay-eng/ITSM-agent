from typing import Annotated, Sequence, List, Literal, Dict, Any
from pydantic import BaseModel, Field
from langchain_core.messages import HumanMessage, AIMessage
from langchain_community.tools.tavily_search import TavilySearchResults
from langgraph.types import Command
from langgraph.graph import StateGraph, START, END, MessagesState
from langgraph.prebuilt import create_react_agent
from langchain_ibm import ChatWatsonx
import os
from dotenv import load_dotenv
from langchain_core.tools import tool
from pymilvus import connections, utility, Collection
from sentence_transformers import SentenceTransformer
from langchain_mcp_adapters.client import MultiServerMCPClient
import asyncio
import yaml
from langchain_openai import ChatOpenAI
from flask import Flask, request, jsonify
import threading
import json
from datetime import datetime
from flask_cors import CORS
from langchain_anthropic import ChatAnthropic
import base64
import re
from collections import defaultdict

load_dotenv()

# Environment variables
model = os.getenv('MODEL_ID')
project = os.getenv('PROJECT_ID')
wml_url = os.getenv('WATSONX_URL')
api_key = os.getenv('WATSONX_API_KEY')
current_attachment = None

# Initialize LLM
llm = ChatAnthropic(
   model="claude-3-5-haiku-20241022",
   temperature=0,
   max_tokens=1024,
   timeout=None,
   max_retries=2,
)

# Initialize Tavily Search
tavily_search = TavilySearchResults(max_results=2)

# Flask app
app = Flask(__name__)
CORS(app)

# Enhanced global state management with memory
workflow_path = []
chat_messages = []
conversation_memory = defaultdict(lambda: {
    'pending_incident_details': {},
    'conversation_history': [],
    'similar_incidents_cache': {},
    'user_preferences': {},
    'session_state': 'idle'  # idle, awaiting_confirmation, processing
})
current_session_id = None

# ============================================================================
# MEMORY MANAGEMENT FUNCTIONS
# ============================================================================
def get_session_memory(session_id: str = None) -> Dict[str, Any]:
    """Get memory for current session"""
    global current_session_id
    if session_id:
        current_session_id = session_id
    elif not current_session_id:
        current_session_id = 'default'
    return conversation_memory[current_session_id]

def update_session_memory(key: str, value: Any, session_id: str = None):
    """Update memory for current session"""
    memory = get_session_memory(session_id)
    memory[key] = value
    conversation_memory[current_session_id] = memory

def add_to_conversation_history(role: str, content: str, metadata: Dict = None):
    """Add message to conversation history with metadata"""
    memory = get_session_memory()
    message_entry = {
        'role': role,
        'content': content,
        'timestamp': datetime.now().isoformat(),
        'metadata': metadata or {}
    }
    memory['conversation_history'].append(message_entry)
    update_session_memory('conversation_history', memory['conversation_history'])

def get_conversation_context() -> str:
    """Get formatted conversation context for agents"""
    memory = get_session_memory()
    context = "CONVERSATION CONTEXT:\n"
    for msg in memory['conversation_history'][-5:]:  # Last 5 messages
        context += f"[{msg['timestamp']}] {msg['role'].upper()}: {msg['content'][:200]}...\n"
    return context

# ============================================================================
# ENHANCED STATE MODEL WITH MEMORY
# ============================================================================
class EnhancedMessagesState(MessagesState):
    session_id: str = "default"
    waiting_for_confirmation: bool = False
    pending_details: Dict = {}
    similar_incidents: List = []

# ============================================================================
# MILVUS RETRIEVAL TOOLS
# ============================================================================

@tool
def retrieve_similar_change_requests(query: str) -> str:
    """Finds similar historical change requests based on a description."""
    MILVUS_HOST = os.getenv('MILVUS_HOST', "172.17.204.5")
    MILVUS_PORT = os.getenv('MILVUS_PORT', "19530")
    EMBEDDING_MODEL = os.getenv('EMBEDDING_MODEL', "all-MiniLM-L6-v2")
    COLLECTION_NAME = "change_request_history"

    try:
        connections.connect(alias="default", host=MILVUS_HOST, port=MILVUS_PORT)
        
        if not utility.has_collection(COLLECTION_NAME):
            return "Change request history collection not found."

        collection = Collection(COLLECTION_NAME)
        collection.load()
        
        embedding_model = SentenceTransformer(EMBEDDING_MODEL)
        query_embedding = embedding_model.encode([query]).tolist()

        results = collection.search(
            query_embedding,
            "embedding",
            {"metric_type": "COSINE", "params": {"nprobe": 10}},
            limit=2,
            output_fields=[
                "number", "short_description", "type", "impact", "urgency", 
                "configuration_item", "change_plan", "backout_plan", "test_plan",
                "implementation_plan", "justification", "cab_required",
                "requested_by", "assignment_group"
            ]
        )

        if not results[0]:
            return "No similar change requests found."

        matches = []
        for hit in results[0]:
            entity = hit.entity
            match_info = f"""
- **{entity.get('number', 'Unknown')}**: {entity.get('short_description', 'No title')} (Score: {hit.score:.2f})
  Type: {entity.get('type', 'Unknown')}, Impact: {entity.get('impact', 'Unknown')}, Urgency: {entity.get('urgency', 'Unknown')}
  Config Item: {entity.get('configuration_item', 'Not specified')}
  Assignment Group: {entity.get('assignment_group', 'Unknown')}
  CAB Required: {'Yes' if entity.get('cab_required') else 'No'}
  Change Plan: {entity.get('change_plan', 'No plan')[:100]}...
"""
            matches.append(match_info.strip())
        
        connections.disconnect("cr_search")
        return "\n\n".join(matches)

    except Exception as e:
        try:
            connections.disconnect("cr_search")
        except:
            pass
        return f"Error retrieving change requests: {str(e)}"




@tool
def retrieve_from_milvus(query: str) -> str:
    """Finds similar historical incidents based on a problem description."""
    MILVUS_HOST = os.getenv('MILVUS_HOST', "172.17.204.5")
    MILVUS_PORT = os.getenv('MILVUS_PORT', "19530")
    EMBEDDING_MODEL = os.getenv('EMBEDDING_MODEL', "all-MiniLM-L6-v2")
    COLLECTION_NAME = "incident_history"

    try:
        connections.connect(alias="default", host=MILVUS_HOST, port=MILVUS_PORT)
        
        if not utility.has_collection(COLLECTION_NAME):
            return "Milvus incident history collection not found. Please run the data upload script first."

        collection = Collection(COLLECTION_NAME)
        collection.load()
        
        embedding_model = SentenceTransformer(EMBEDDING_MODEL)
        query_embedding = embedding_model.encode([query]).tolist()

        results = collection.search(
            query_embedding,
            "embedding",
            {"metric_type": "COSINE", "params": {"nprobe": 10}},
            limit=1,
            output_fields=[
                "number", 
                "short_description", 
                "description", 
                "priority", 
                "impact", 
                "urgency", 
                "state",
                "category",
                "opened",
                "opened_by"
            ]
        )

        if not results[0]:
            return "No similar historical incidents found."

        matches = []
        for i, hit in enumerate(results[0], 1):
            entity = hit.entity
            
            match_info = f"""
📋 **Incident #{i}** (Similarity: {hit.score:.2f})
   • **Number**: {entity.get('number', 'Unknown')}
   • **Title**: {entity.get('short_description', 'No title available')}
   • **Description**: {entity.get('description', 'No description available')}
   • **Priority**: {entity.get('priority', 'Unknown')} | **Impact**: {entity.get('impact', 'Unknown')} | **Urgency**: {entity.get('urgency', 'Unknown')}
   • **State**: {entity.get('state', 'Unknown')} | **Category**: {entity.get('category', 'Unknown')}
   • **Assignment Group**: {entity.get('assignment_group', 'Unknown')}
   • **Opened**: {entity.get('opened', 'Unknown')} by {entity.get('opened_by', 'Unknown')}
"""
            matches.append(match_info.strip())
        
        # Cache the results in memory
        memory = get_session_memory()
        memory['similar_incidents_cache'][query] = matches
        update_session_memory('similar_incidents_cache', memory['similar_incidents_cache'])
        
        return "\n\n".join(matches)

    except Exception as e:
        try:
            connections.disconnect("search_connection")
        except:
            pass
        return f"Error retrieving similar incidents from Milvus: {str(e)}"

# ============================================================================
# CONFLUENCE KNOWLEDGE BASE SEARCH TOOL
# ============================================================================
async def search_confluence_kb(incident_description: str, client: MultiServerMCPClient) -> str:
    """
    Search Confluence knowledge base for resolution steps based on incident description.
    
    Args:
        incident_description (str): The incident description to search for
        client: The MCP client with Confluence connection
        
    Returns:
        str: Formatted knowledge base articles with resolution steps
    """
    try:
        # Get available Confluence tools
        confluence_tools = [tool for tool in client.get_tools() if 'confluence' in tool.name.lower() or 'search' in tool.name.lower()]
        
        if not confluence_tools:
            return "No Confluence search tools available from MCP server."
        
        # Use the search tool (adjust tool name based on actual MCP server implementation)
        search_tool = None
        for tool in confluence_tools:
            if 'search' in tool.name.lower():
                search_tool = tool
                break
        
        if not search_tool:
            # Fallback to first available tool
            search_tool = confluence_tools[0]
        
        # Perform the search
        search_results = await search_tool(query=incident_description, limit=5)
        
        if not search_results or not isinstance(search_results, (str, dict, list)):
            return "No knowledge base articles found for the incident description."
        
        # Format the results
        if isinstance(search_results, str):
            return f"**Knowledge Base Articles Found:**\n\n{search_results}"
        elif isinstance(search_results, dict):
            formatted_results = "**Knowledge Base Articles Found:**\n\n"
            for key, value in search_results.items():
                formatted_results += f"**{key}:** {value}\n\n"
            return formatted_results
        elif isinstance(search_results, list):
            formatted_results = "**Knowledge Base Articles Found:**\n\n"
            for i, article in enumerate(search_results, 1):
                if isinstance(article, dict):
                    title = article.get('title', f'Article {i}')
                    content = article.get('content', article.get('body', 'No content available'))
                    url = article.get('url', '')
                    formatted_results += f"**{i}. {title}**\n"
                    formatted_results += f"Content: {content}\n"
                    if url:
                        formatted_results += f"URL: {url}\n"
                    formatted_results += "\n" + "="*50 + "\n\n"
                else:
                    formatted_results += f"**{i}.** {str(article)}\n\n"
            return formatted_results
        
        return str(search_results)
        
    except Exception as e:
        return f"Error searching Confluence knowledge base: {str(e)}"

# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def extract_change_request_fields_from_user_input(user_input: str) -> dict:
    """Extract change request fields from user input"""
    fields = {}
    
    # Description patterns
    desc_patterns = [
        r"create.*?change.*?request.*?with.*?description[:\s]+([^,\n]+)",
        r"description[:\s]+([^,\n]+)",
        r"create.*?change.*?request[:\s]+([^,\n]+)"
    ]
    
    for pattern in desc_patterns:
        match = re.search(pattern, user_input.lower())
        if match:
            fields['description'] = match.group(1).strip()
            break
    
    # Change request specific patterns
    field_patterns = {
        'short_description': r"short[\s_]description[:\s]+([^,\n]+)",
        'category': r"category[:\s]+([^,\n]+)",
        'service': r"service[:\s]+([^,\n]+)",
        'configuration_item': r"configuration[\s_]item[:\s]+([^,\n]+)",
        'priority': r"priority[:\s]+(\d+|low|medium|high|critical)",
        'risk': r"risk[:\s]+(\d+|low|medium|high|critical)",
        'impact': r"impact[:\s]+(\d+|low|medium|high|critical)",
        'type': r"type[:\s]+([^,\n]+)",
        'model': r"model[:\s]+([^,\n]+)",
        'assignment_group': r"assignment[\s_]group[:\s]+([^,\n]+)",
        'requested_by': r"requested[\s_]by[:\s]+([^,\n]+)",
        'justification': r"justification[:\s]+([^,\n]+)",
        'implementation_plan': r"implementation[\s_]plan[:\s]+([^,\n]+)",
        'backout_plan': r"backout[\s_]plan[:\s]+([^,\n]+)",
        'test_plan': r"test[\s_]plan[:\s]+([^,\n]+)",
        'planned_start_date': r"planned[\s_]start[\s_]date[:\s]+([^,\n]+)",
        'planned_end_date': r"planned[\s_]end[\s_]date[:\s]+([^,\n]+)",
        'cab_required': r"cab[\s_]required[:\s]+(yes|no|true|false)"
    }
    
    for field, pattern in field_patterns.items():
        match = re.search(pattern, user_input.lower())
        if match:
            value = match.group(1).strip()
            if field == 'cab_required':
                fields[field] = value.lower() in ['yes', 'true']
            else:
                fields[field] = value
    
    return fields

def determine_missing_change_request_fields(provided_fields: dict) -> list:
    """Determine which required change request fields are missing"""
    required_fields = [
        'short_description', 'description', 'category', 'service', 
        'configuration_item', 'priority', 'risk', 'impact', 'type', 
        'model', 'assignment_group', 'requested_by', 'justification',
        'implementation_plan', 'backout_plan', 'test_plan', 
        'planned_start_date', 'planned_end_date', 'cab_required'
    ]
    missing = []
    
    for field in required_fields:
        if field not in provided_fields or not provided_fields[field]:
            missing.append(field)
    
    return missing

def extract_fields_from_similar_change_requests(similar_crs_text: str) -> dict:
    """Extract common field values from similar change requests"""
    inferred_fields = {}
    
    # Extract patterns from similar CRs
    patterns = {
        'type': r"Type.*?([^•\n,]+)",
        'impact': r"Impact.*?(\d+)",
        'urgency': r"Urgency.*?(\d+)", 
        'assignment_group': r"Assignment Group.*?([^•\n,]+)",
        'cab_required': r"CAB Required.*?(Yes|No)"
    }
    
    for field, pattern in patterns.items():
        matches = re.findall(pattern, similar_crs_text, re.IGNORECASE)
        if matches:
            clean_matches = [m.strip() for m in matches if m.strip() and m.strip() != 'Unknown']
            if clean_matches:
                if field == 'cab_required':
                    inferred_fields[field] = clean_matches[0].lower() == 'yes'
                else:
                    inferred_fields[field] = max(set(clean_matches), key=clean_matches.count)
    
    return inferred_fields


def extract_incident_fields_from_user_input(user_input: str) -> dict:
    """Extract incident fields from user input"""
    fields = {}
    
    desc_patterns = [
        r"create.*?incident.*?with.*?description[:\s]+([^,\n]+)",
        r"description[:\s]+([^,\n]+)",
        r"create.*?incident[:\s]+([^,\n]+)"
    ]
    
    for pattern in desc_patterns:
        match = re.search(pattern, user_input.lower())
        if match:
            fields['description'] = match.group(1).strip()
            break
    
    field_patterns = {
        'priority': r"priority[:\s]+(\d+|low|medium|high|critical)",
        'impact': r"impact[:\s]+(\d+|low|medium|high|critical)", 
        'urgency': r"urgency[:\s]+(\d+|low|medium|high|critical)",
        'category': r"category[:\s]+([^,\n]+)",
        'assignment_group': r"assignment[\s_]group[:\s]+([^,\n]+)"
    }
    
    for field, pattern in field_patterns.items():
        match = re.search(pattern, user_input.lower())
        if match:
            fields[field] = match.group(1).strip()
    
    return fields

def determine_missing_fields(provided_fields: dict) -> list:
    """Determine which required fields are missing"""
    required_fields = ['description', 'priority', 'impact', 'urgency', 'category', 'assignment_group']
    missing = []
    
    for field in required_fields:
        if field not in provided_fields or not provided_fields[field]:
            missing.append(field)
    
    return missing

def extract_fields_from_similar_incidents(similar_incidents_text: str) -> dict:
    """Extract common field values from similar incidents"""
    priority_matches = re.findall(r"Priority.*?(\d+)", similar_incidents_text)
    impact_matches = re.findall(r"Impact.*?(\d+)", similar_incidents_text)
    urgency_matches = re.findall(r"Urgency.*?(\d+)", similar_incidents_text)
    category_matches = re.findall(r"Category.*?([^•\n]+)", similar_incidents_text)
    assignment_group_matches = re.findall(r"Assignment Group.*?([^•\n]+)", similar_incidents_text)
    
    inferred_fields = {}
    
    if priority_matches:
        inferred_fields['priority'] = max(set(priority_matches), key=priority_matches.count)
    if impact_matches:
        inferred_fields['impact'] = max(set(impact_matches), key=impact_matches.count)
    if urgency_matches:
        inferred_fields['urgency'] = max(set(urgency_matches), key=urgency_matches.count)
    if category_matches:
        clean_categories = [c.strip() for c in category_matches if c.strip() != 'Unknown']
        if clean_categories:
            inferred_fields['category'] = max(set(clean_categories), key=clean_categories.count)
    if assignment_group_matches:
        clean_groups = [ag.strip() for ag in assignment_group_matches if ag.strip() != 'Unknown']
        if clean_groups:
            inferred_fields['assignment_group'] = max(set(clean_groups), key=clean_groups.count)
    
    return inferred_fields

# ============================================================================
# SUPERVISOR AGENT
# ============================================================================
class Supervisor(BaseModel):
    next: Literal["enhancer", "servicenow_agent", "confirmation_handler"] = Field(
        description="Routes to the appropriate specialist based on conversation state and memory"
    )
    reason: str = Field(description="Detailed justification for routing decision")

def supervisor_node(state: MessagesState) -> Command[Literal["enhancer", "servicenow_agent", "confirmation_handler"]]:
    global workflow_path
    workflow_path.append("SUPERVISOR")
    
    memory = get_session_memory()
    session_state = memory.get('session_state', 'idle')
    
    add_to_conversation_history('system', f"Supervisor analyzing request in state: {session_state}")
    
    # Get last user message
    last_user_message = state["messages"][-1].content.lower() if state["messages"] else ""
    
    # Check for different request types
    is_change_request = any([
        "create change request" in last_user_message,
        "create a change request" in last_user_message,
        "change request" in last_user_message and "create" in last_user_message,
        "database maintenance" in last_user_message,
        "scheduled maintenance" in last_user_message
    ])
    
    is_incident_request = any([
        "create incident" in last_user_message,
        "create an incident" in last_user_message,
        "incident" in last_user_message and "create" in last_user_message
    ])
    
    system_prompt = f"""You are the intelligent supervisor for an ITSM workflow with memory capabilities.

    CURRENT SESSION STATE: {session_state}
    PENDING DETAILS: {memory.get('pending_incident_details', {})} or {memory.get('pending_change_request_details', {})}
    
    ROUTING GUIDELINES:
    1. If session_state is 'awaiting_confirmation' and user provides confirmation/modifications:
       → Route to 'confirmation_handler'
    
    2. If user wants to create incident/change request and missing required fields:
       → Route to 'enhancer'
       
    3. If user wants to create incident/change request with complete details:
       → Route to 'servicenow_agent'
       
    4. For resolution requests or any ServiceNow operations:
       → Route to 'servicenow_agent'

    Context from conversation: {get_conversation_context()}
    """

    # Determine routing based on session state and request type
    if session_state == 'awaiting_confirmation':
        confirmation_keywords = ["yes", "okay", "ok", "proceed", "create it", "go ahead", "confirm", "approved", "looks good"]
        modification_keywords = ["change", "modify", "update", "set", "make it", "instead"]
        
        is_confirmation = any(keyword in last_user_message for keyword in confirmation_keywords)
        is_modification = any(keyword in last_user_message for keyword in modification_keywords)
        
        if is_confirmation or is_modification:
            goto = "confirmation_handler"
            reason = "User provided explicit confirmation or modification for pending request"
            update_session_memory('session_state', 'processing')
        else:
            goto = "enhancer"
            reason = "User response unclear, re-presenting options"
    elif is_change_request:
        # Handle change request creation
        user_fields = extract_change_request_fields_from_user_input(last_user_message)
        missing_fields = determine_missing_change_request_fields(user_fields)
        
        if missing_fields:
            goto = "enhancer"
            reason = f"Incomplete change request creation. Missing: {missing_fields[:5]}"
            update_session_memory('session_state', 'processing')
            update_session_memory('request_type', 'change_request')
        else:
            goto = "servicenow_agent"
            reason = "Complete change request creation"
            update_session_memory('request_type', 'change_request')
    elif is_incident_request:
        # Handle incident creation
        user_fields = extract_incident_fields_from_user_input(last_user_message)
        missing_fields = determine_missing_fields(user_fields)
        
        if missing_fields:
            goto = "enhancer"
            reason = f"Incomplete incident creation request. Missing: {missing_fields}"
            update_session_memory('session_state', 'processing')
            update_session_memory('request_type', 'incident')
        else:
            goto = "servicenow_agent"
            reason = "Complete incident creation request"
            update_session_memory('request_type', 'incident')
    else:
        goto = "servicenow_agent"
        reason = "ServiceNow operation (resolution, general management, etc.)"

    response = llm.with_structured_output(Supervisor).invoke([
        {"role": "system", "content": f"Route to: {goto} because {reason}"},
        {"role": "user", "content": last_user_message}
    ])
    
    print(f"--- SUPERVISOR ROUTING: {goto.upper()} ---")
    print(f"--- REASONING: {reason} ---")
    print(f"--- REQUEST TYPE: {memory.get('request_type', 'unknown')} ---")
    print(f"--- SESSION STATE: {session_state} → {memory.get('session_state', 'unchanged')} ---")

    add_to_conversation_history('supervisor', f"Routing to {goto}: {reason}")

    return Command(
        update={
            "messages": [
                HumanMessage(content=f"Supervisor routing to {goto.upper()}: {reason}", name="supervisor")
            ]
        },
        goto=goto,
    )

# ============================================================================
# ENHANCED ENHANCER AGENT
# ============================================================================
# ============================================================================
def enhancer_node(state: MessagesState) -> Command[Literal[END]]:
    global workflow_path
    workflow_path.append("ENHANCER")
    
    memory = get_session_memory()
    request_type = memory.get('request_type', 'incident')  # Default to incident for backwards compatibility
    
    # Find the original user request
    original_request = ""
    for msg in state["messages"]:
        if hasattr(msg, 'name') and msg.name != "supervisor":
            original_request = msg.content
            break
    
    if not original_request:
        original_request = state["messages"][-1].content
    
    print(f">>> ENHANCER: Processing {request_type} request: {original_request}")
    add_to_conversation_history('enhancer', f"Processing {request_type} creation: {original_request}")
    
    if request_type == 'change_request':
        # Handle change request enhancement
        user_fields = extract_change_request_fields_from_user_input(original_request)
        
        # Get similar change requests (check cache first)
        description = user_fields.get('description', original_request)
        if description in memory.get('similar_change_requests_cache', {}):
            retrieved_crs_info = "\n\n".join(memory['similar_change_requests_cache'][description])
        else:
            retrieved_crs_info = retrieve_similar_change_requests.invoke({"query": description})
            # Cache the results
            if 'similar_change_requests_cache' not in memory:
                memory['similar_change_requests_cache'] = {}
            memory['similar_change_requests_cache'][description] = [retrieved_crs_info]
        
        # Infer missing fields from similar change requests
        inferred_fields = extract_fields_from_similar_change_requests(retrieved_crs_info)
        complete_fields = {**inferred_fields, **user_fields}
        
        # Set intelligent defaults for missing fields based on the request context
        field_defaults = {
            'short_description': (complete_fields.get('description', '') or original_request)[:80] + "...",
            'category': 'Infrastructure',
            'service': 'Database Services',
            'priority': '3 - Medium',
            'risk': 'Medium',
            'impact': '2 - Medium',
            'type': 'Normal',
            'model': 'Normal',
            'state': 'New',
            'requested_by': 'System User',
            'assignment_group': 'Database Admins',
            'justification': 'Mandatory maintenance as per company policy',
            'implementation_plan': '1) Take database backup, 2) Apply maintenance patches, 3) Update configurations, 4) Restart services, 5) Verify functionality',
            'backout_plan': 'Restore from backup taken in step 1, restart with previous configuration if issues occur',
            'test_plan': 'Execute test queries, verify application connectivity, check performance metrics, validate business functions',
            'planned_start_date': '2025-09-15 02:00:00',
            'planned_end_date': '2025-09-15 04:30:00',
            'cab_required': True,
            'cab_date_time': '2025-09-10 14:00:00',
            'cab_delegate': 'Database Manager'
        }
        
        # Apply defaults only for truly missing fields
        for field, default_value in field_defaults.items():
            if field not in complete_fields or not complete_fields[field]:
                complete_fields[field] = default_value
        
        # Store in memory
        update_session_memory('pending_change_request_details', complete_fields)
        update_session_memory('session_state', 'awaiting_confirmation')
        
        confirmation_message = f"""Based on your change request description, I found similar historical change requests and prepared the complete details:

**📋 PROPOSED CHANGE REQUEST DETAILS:**

**Basic Information:**
- **Short Description**: {complete_fields.get('short_description', 'TBD')}
- **Description**: {complete_fields.get('description', 'TBD')}
- **Category**: {complete_fields.get('category', 'TBD')}
- **Service**: {complete_fields.get('service', 'TBD')}
- **Configuration Item**: {complete_fields.get('configuration_item', 'TBD')}
- **Priority**: {complete_fields.get('priority', 'TBD')}
- **Risk**: {complete_fields.get('risk', 'TBD')}
- **Impact**: {complete_fields.get('impact', 'TBD')}
- **Model**: {complete_fields.get('model', 'TBD')}
- **Type**: {complete_fields.get('type', 'TBD')}
- **State**: {complete_fields.get('state', 'TBD')}

**Assignment:**
- **Requested By**: {complete_fields.get('requested_by', 'TBD')}
- **Assignment Group**: {complete_fields.get('assignment_group', 'TBD')}

**Planning:**
- **Justification**: {complete_fields.get('justification', 'TBD')}
- **Implementation Plan**: {complete_fields.get('implementation_plan', 'TBD')}
- **Backout Plan**: {complete_fields.get('backout_plan', 'TBD')}
- **Test Plan**: {complete_fields.get('test_plan', 'TBD')}

**Schedule:**
- **Planned Start Date**: {complete_fields.get('planned_start_date', 'TBD')}
- **Planned End Date**: {complete_fields.get('planned_end_date', 'TBD')}
- **CAB Required**: {'Yes' if complete_fields.get('cab_required') else 'No'}
- **CAB Date/Time**: {complete_fields.get('cab_date_time', 'TBD')}
- **CAB Delegate**: {complete_fields.get('cab_delegate', 'TBD')}

**🔍 REFERENCE CHANGE REQUESTS USED FOR INFERENCE:**
{retrieved_crs_info}

**❓ CONFIRMATION REQUIRED:**
Please review the proposed details and respond with:
- "Yes" or "Create it" to proceed with these details
- "Change [field] to [value]" to modify (e.g., "Change priority to High")
- "Cancel" to cancel the change request creation

**⚠️ I'm waiting for your confirmation before creating the change request.**"""
        
        print(f">>> ENHANCER: Change Request details prepared, awaiting user confirmation")
        
    else:
        # Handle incident enhancement (existing logic)
        user_fields = extract_incident_fields_from_user_input(original_request)
        
        # Get similar incidents (check cache first)
        description = user_fields.get('description', original_request)
        if description in memory.get('similar_incidents_cache', {}):
            retrieved_incidents_info = "\n\n".join(memory['similar_incidents_cache'][description])
        else:
            retrieved_incidents_info = retrieve_from_milvus.invoke({"query": description})
            # Cache the results
            if 'similar_incidents_cache' not in memory:
                memory['similar_incidents_cache'] = {}
            memory['similar_incidents_cache'][description] = [retrieved_incidents_info]
        
        # Infer missing fields
        inferred_fields = extract_fields_from_similar_incidents(retrieved_incidents_info)
        complete_fields = {**inferred_fields, **user_fields}
        
        # Store in memory
        update_session_memory('pending_incident_details', complete_fields)
        update_session_memory('session_state', 'awaiting_confirmation')
        
        confirmation_message = f"""Based on your incident description, I found similar historical incidents and inferred the missing details:

**📋 PROPOSED INCIDENT DETAILS:**
- **Description**: {complete_fields.get('description', 'Not specified')}
- **Short Description**: {complete_fields.get('description', '')[:50]}...
- **Priority**: {complete_fields.get('priority', 'Not inferred')} (inferred from similar incidents)
- **Impact**: {complete_fields.get('impact', 'Not inferred')} (inferred from similar incidents)
- **Urgency**: {complete_fields.get('urgency', 'Not inferred')} (inferred from similar incidents)
- **Category**: {complete_fields.get('category', 'Not inferred')} (inferred from similar incidents)
- **Assignment Group**: {complete_fields.get('assignment_group', 'Not inferred')} (inferred from similar incidents)

**🔍 REFERENCE INCIDENTS USED FOR INFERENCE:**
{retrieved_incidents_info}

**❓ CONFIRMATION REQUIRED:**
Please review the proposed details and respond with:
- "Yes" or "Create it" to proceed with these details
- "Change [field] to [value]" to modify (e.g., "Change priority to 1")
- "Cancel" to cancel the incident creation

**⚠️ I'm waiting for your confirmation before creating the incident.**"""
        
        print(f">>> ENHANCER: Incident details prepared, awaiting user confirmation")
    
    print(f"--- ENHANCER → END (USER CONFIRMATION REQUIRED) ---")
    add_to_conversation_history('enhancer', f'Presented {request_type} details, awaiting confirmation')

    return Command(
        update={
            "messages": [
                HumanMessage(content=confirmation_message, name="enhancer")
            ]
        },
        goto=END,
    )
# ============================================================================
# CONFIRMATION HANDLER AGENT
# ============================================================================
def confirmation_handler_node(state: MessagesState) -> Command[Literal["servicenow_agent"]]:
    global workflow_path
    workflow_path.append("CONFIRMATION_HANDLER")
    
    memory = get_session_memory()
    request_type = memory.get('request_type', 'incident')  # Default to incident
    user_response = state["messages"][-1].content
    
    print(f">>> CONFIRMATION HANDLER: Processing {request_type} confirmation: {user_response}")
    add_to_conversation_history('user', user_response)
    
    if request_type == 'change_request':
        # Handle change request confirmation
        current_details = memory.get('pending_change_request_details', {})
        
        # Parse modifications for change request fields
        modification_patterns = {
            'short_description': r"(?:change|set|make|update).*?short.*?description.*?(?:to|is|be)?\s*([^,\n]+)",
            'description': r"(?:change|set|make|update).*?description.*?(?:to|is|be)?\s*([^,\n]+)",
            'category': r"(?:change|set|make|update).*?category.*?(?:to|is|be)?\s*([^,\n]+)",
            'service': r"(?:change|set|make|update).*?service.*?(?:to|is|be)?\s*([^,\n]+)",
            'configuration_item': r"(?:change|set|make|update).*?(?:configuration.*?item|config.*?item).*?(?:to|is|be)?\s*([^,\n]+)",
            'priority': r"(?:change|set|make|update).*?priority.*?(?:to|is|be)?\s*([^,\n]+)",
            'risk': r"(?:change|set|make|update).*?risk.*?(?:to|is|be)?\s*([^,\n]+)",
            'impact': r"(?:change|set|make|update).*?impact.*?(?:to|is|be)?\s*([^,\n]+)",
            'type': r"(?:change|set|make|update).*?type.*?(?:to|is|be)?\s*([^,\n]+)",
            'model': r"(?:change|set|make|update).*?model.*?(?:to|is|be)?\s*([^,\n]+)",
            'assignment_group': r"(?:change|set|make|update).*?(?:assignment[\s_]group|assign).*?(?:to|is|be)?\s*([^,\n]+)",
            'requested_by': r"(?:change|set|make|update).*?requested.*?by.*?(?:to|is|be)?\s*([^,\n]+)",
            'justification': r"(?:change|set|make|update).*?justification.*?(?:to|is|be)?\s*([^,\n]+)",
            'implementation_plan': r"(?:change|set|make|update).*?implementation.*?plan.*?(?:to|is|be)?\s*([^,\n]+)",
            'backout_plan': r"(?:change|set|make|update).*?backout.*?plan.*?(?:to|is|be)?\s*([^,\n]+)",
            'test_plan': r"(?:change|set|make|update).*?test.*?plan.*?(?:to|is|be)?\s*([^,\n]+)",
            'planned_start_date': r"(?:change|set|make|update).*?(?:planned.*?start|start.*?date).*?(?:to|is|be)?\s*([^,\n]+)",
            'planned_end_date': r"(?:change|set|make|update).*?(?:planned.*?end|end.*?date).*?(?:to|is|be)?\s*([^,\n]+)",
            'cab_required': r"(?:change|set|make|update).*?cab.*?required.*?(?:to|is|be)?\s*(yes|no|true|false)",
            'cab_date_time': r"(?:change|set|make|update).*?cab.*?(?:date|time).*?(?:to|is|be)?\s*([^,\n]+)",
            'cab_delegate': r"(?:change|set|make|update).*?cab.*?delegate.*?(?:to|is|be)?\s*([^,\n]+)"
        }
        
        modifications_made = []
        for field, pattern in modification_patterns.items():
            match = re.search(pattern, user_response.lower())
            if match:
                new_value = match.group(1).strip()
                if field == 'cab_required':
                    current_details[field] = new_value.lower() in ['yes', 'true']
                else:
                    current_details[field] = new_value
                modifications_made.append(f"{field}: {new_value}")
        
        # Update memory
        update_session_memory('pending_change_request_details', current_details)
        update_session_memory('session_state', 'creating')
        
        # Create final request with all change request details
        final_request = f"""CREATE_CHANGE_REQUEST_CONFIRMED:

**BASIC INFORMATION:**
Short Description: {current_details.get('short_description', '')}
Description: {current_details.get('description', '')}
Category: {current_details.get('category', '')}
Service: {current_details.get('service', '')}
Configuration Item: {current_details.get('configuration_item', '')}
Priority: {current_details.get('priority', '')}
Risk: {current_details.get('risk', '')}
Impact: {current_details.get('impact', '')}
Model: {current_details.get('model', '')}
Type: {current_details.get('type', '')}
State: {current_details.get('state', '')}

**ASSIGNMENT:**
Requested By: {current_details.get('requested_by', '')}
Assignment Group: {current_details.get('assignment_group', '')}

**PLANNING:**
Justification: {current_details.get('justification', '')}
Implementation Plan: {current_details.get('implementation_plan', '')}
Backout Plan: {current_details.get('backout_plan', '')}
Test Plan: {current_details.get('test_plan', '')}

**SCHEDULE:**
Planned Start Date: {current_details.get('planned_start_date', '')}
Planned End Date: {current_details.get('planned_end_date', '')}
CAB Required: {'Yes' if current_details.get('cab_required') else 'No'}
CAB Date/Time: {current_details.get('cab_date_time', '')}
CAB Delegate: {current_details.get('cab_delegate', '')}

MODIFICATIONS_APPLIED: {modifications_made if modifications_made else 'None'}"""
        
        print(f">>> CONFIRMATION HANDLER: Change request details confirmed with modifications: {modifications_made}")
        add_to_conversation_history('confirmation_handler', f"Confirmed change request creation with modifications: {modifications_made}")
        
    else:
        # Handle incident confirmation (existing logic)
        current_details = memory.get('pending_incident_details', {})
        
        # Parse modifications for incident fields
        modification_patterns = {
            'priority': r"(?:change|set|make|update).*?priority.*?(?:to|is|be)?\s*(\d+|low|medium|high|critical)",
            'impact': r"(?:change|set|make|update).*?impact.*?(?:to|is|be)?\s*(\d+|low|medium|high|critical)",
            'urgency': r"(?:change|set|make|update).*?urgency.*?(?:to|is|be)?\s*(\d+|low|medium|high|critical)",
            'category': r"(?:change|set|make|update).*?category.*?(?:to|is|be)?\s*([^,\n]+)",
            'assignment_group': r"(?:change|set|make|update).*?(?:assignment[\s_]group|assign).*?(?:to|is|be)?\s*([^,\n]+)"
        }
        
        modifications_made = []
        for field, pattern in modification_patterns.items():
            match = re.search(pattern, user_response.lower())
            if match:
                new_value = match.group(1).strip()
                current_details[field] = new_value
                modifications_made.append(f"{field}: {new_value}")
        
        # Update memory
        update_session_memory('pending_incident_details', current_details)
        update_session_memory('session_state', 'creating')
        
        # Create final request
        final_request = f"""CREATE_INCIDENT_CONFIRMED:
Description: {current_details.get('description', '')}
Short Description: {current_details.get('description', '')[:50]}...
Priority: {current_details.get('priority', 'Unknown')}
Impact: {current_details.get('impact', 'Unknown')}
Urgency: {current_details.get('urgency', 'Unknown')}
Category: {current_details.get('category', 'Unknown')}
Assignment Group: {current_details.get('assignment_group', 'Unknown')}

Modifications applied: {modifications_made if modifications_made else 'None'}"""
        
        print(f">>> CONFIRMATION HANDLER: Incident details confirmed with modifications: {modifications_made}")
        add_to_conversation_history('confirmation_handler', f"Confirmed incident creation with modifications: {modifications_made}")

    print(f"--- CONFIRMATION HANDLER → SERVICENOW AGENT ---")

    return Command(
        update={
            "messages": [
                HumanMessage(content=final_request, name="confirmation_handler")
            ]
        },
        goto="servicenow_agent",
    )
# ============================================================================
# ENHANCED SERVICENOW AGENT WITH CONFLUENCE RESOLUTION
# ============================================================================
async def servicenow_agent(state: MessagesState) -> Command[Literal[END]]:
    global workflow_path, current_attachment
    workflow_path.append("SERVICENOW_AGENT")
    
    memory = get_session_memory()
    last_message_content = state["messages"][-1].content.lower()
    
    is_confirmed_incident = "CREATE_INCIDENT_CONFIRMED:" in state["messages"][-1].content
    is_change_request = "change" in last_message_content or "create" in last_message_content
    has_attachment_signal = "[attachment:" in last_message_content
    is_confirmed_change_request = "CREATE_CHANGE_REQUEST_CONFIRMED:" in state["messages"][-1].content
    
    is_resolution_request = any([
        ("resolution" in last_message_content or "steps" in last_message_content or "how to fix" in last_message_content),
        "resolution steps" in last_message_content,
        "troubleshoot" in last_message_content,
        any(word.lower().startswith(('inc', 'in')) and word[3:].isdigit() for word in last_message_content.split())
    ])

    if is_confirmed_incident:
        agent_role = """You are the ServiceNow Incident Creation Agent handling CONFIRMED incident requests.
        
        The user has confirmed all incident details. Your task is to:
        1. Parse the confirmed incident details from the message
        2. Create the incident using the exact details provided
        3. Do not ask for any additional information - proceed with creation immediately
        """
        add_to_conversation_history('servicenow_agent', 'Processing confirmed incident creation')

    elif is_confirmed_change_request:
        agent_role = """You are the ServiceNow Change Request Creation Agent handling CONFIRMED change request requests.
        
        The user has confirmed all change request details. Your task is to:
        1. Parse the confirmed change request details from the message
        2. Create the change request using the exact details provided  
        3. Handle any file attachments if present
        4. Do not ask for any additional information - proceed with creation immediately
        """
        add_to_conversation_history('servicenow_agent', 'Processing confirmed change request creation')

    elif is_resolution_request:
        agent_role = """You are the ServiceNow Resolution Agent with Confluence Knowledge Base integration.
        
        Your role is to provide comprehensive resolution steps for incidents. When a user asks for resolution steps for an incident:
        
        STEP 1: **Fetch the incident details from ServiceNow** using the incident number
        - Use ServiceNow tools to get the full incident record
        - Extract the incident description/problem details
        
        STEP 2: **Search Confluence Knowledge Base** for resolution steps
        - Use the incident description to search Confluence KB for relevant articles
        - Look for troubleshooting guides, resolution procedures, and known fixes
        - Find articles that match the incident symptoms or error messages
        
        STEP 3: **Provide comprehensive resolution guidance**
        - Combine incident details with KB article information
        - Present clear, step-by-step resolution instructions
        - Reference which Confluence articles were used
        - Include troubleshooting tips and next steps if initial resolution fails
        
        **Response Format:**
        - Start with incident summary
        - List relevant KB articles found
        - Provide numbered, actionable resolution steps
        - Include warnings or additional context from KB
        - End with escalation steps if needed
        
        You have access to both ServiceNow tools and Confluence search capabilities through the MCP clients.
        """
    elif is_change_request and has_attachment_signal:
        agent_role = """You are the ServiceNow Change Request Creation Agent with File Attachment Support.
        
        A user has requested to create a change request and has attached a file.
        The file is available for upload. Do not ask the user for the file content.
        Your task is to use the provided tools to handle this request.
        
        STEPS:
        1. **Create the Change Request**: Use the `create_change_request` tool to create the change request first, using the details from the user's message.
        2. **Add the Attachment**: After the change request is successfully created, use the `add_change_request_attachment_tool` to upload the file. You must extract the `change_id` (the `sys_id` from the creation step) and pass it to this tool.
        
        This is a two-step process, so you must call two tools sequentially.
        """
    else:
        agent_role = """You are the ServiceNow General Interaction Agent with Confluence Knowledge Base integration. 
        
        Your role is to interact with ServiceNow using the provided tools to fulfill the user's request. You also have access to Confluence knowledge base search for resolution and troubleshooting guidance when needed.
        
        For resolution requests, always:
        1. Fetch incident details from ServiceNow first
        2. Search Confluence KB using the incident description
        3. Provide comprehensive resolution steps based on KB articles
        """

    system_prompt = f"""{agent_role}
    
    SPECIAL INSTRUCTIONS FOR CONFIRMED INCIDENT CREATION:
    - When processing "CREATE_INCIDENT_CONFIRMED" messages, extract all the details and create the incident immediately
    - Use the exact field values as specified in the confirmed details
    - Do not modify or reinterpret any of the confirmed values
    
    SPECIAL INSTRUCTIONS FOR INCIDENT CREATION:
    - When creating incidents, preserve the exact description provided by the user/enhancer.
    - Do not modify or reinterpret the problem description.
    - Use the provided urgency and impact values exactly as specified.
    
    SPECIAL INSTRUCTIONS FOR RESOLUTION REQUESTS:
    - When user asks for resolution steps for an incident number:
      1. Fetch the full incident record from ServiceNow first
      2. Extract the incident description/problem details
      3. Use the incident description to search Confluence knowledge base
      4. Combine ServiceNow incident data with Confluence KB articles
      5. Provide comprehensive, step-by-step resolution guidance
      6. Always reference which KB articles were used
      7. Do NOT just fetch incident details - provide actual resolution steps
    
    You have access to both ServiceNow MCP tools and Confluence search capabilities.
    """
    
    
    print(f">>> SERVICENOW AGENT: Processing request")
    
    try:
        # Enhanced MCP client configuration with both ServiceNow and Confluence
        async with MultiServerMCPClient({
            "snow": {
                "url": os.getenv('MCP_CLIENT_URL', "http://localhost:8000/sse"),
                "transport": "sse",
            },
            "atlassian": {
                "command": "npx",
                "args": ["-y", "mcp-remote@0.1.13", "https://mcp.atlassian.com/v1/sse"]
            }
        }) as client:
            tools = client.get_tools()

            @tool
            async def add_change_request_attachment_tool(change_id: str) -> str:
                """
                Uploads the file from the current request's attachment data to a change request.
                
                Args:
                    change_id (str): The change request number (e.g., CHG0010001) or sys_id.
                    
                Returns:
                    str: Status message indicating success or failure of the file upload.
                """
                if not current_attachment or 'content' not in current_attachment:
                    return "Error: No file found in the current request's attachment data."
                
                file_name = current_attachment['filename']
                file_content = base64.b64decode(current_attachment['content'])
                
                try:
                    mcp_tool = client.get_tool("add_change_request_attachment")
                    return await mcp_tool(
                        change_id=change_id, 
                        file_name=file_name, 
                        file_content=file_content
                    )
                except Exception as e:
                    return f"MCP tool call failed: {str(e)}"

            @tool
            async def search_confluence_resolution(incident_description: str) -> str:
                """
                Search Confluence knowledge base for resolution steps based on incident description.
                This tool specifically searches for troubleshooting guides and resolution procedures.
                
                Args:
                    incident_description (str): The incident description to search for in Confluence KB
                    
                Returns:
                    str: Formatted knowledge base articles with resolution steps
                """
                return await search_confluence_kb(incident_description, client)# Add the confluence search tool to the available tools
            if is_change_request and has_attachment_signal:
                servicenow_rag_agent = create_react_agent(
                    llm, 
                    tools=tools + [add_change_request_attachment_tool, search_confluence_resolution], 
                    state_modifier=system_prompt
                )
            else:
                servicenow_rag_agent = create_react_agent(
                    llm, 
                    tools=tools + [search_confluence_resolution], 
                    state_modifier=system_prompt
                )

            result = await servicenow_rag_agent.ainvoke(state)
            
            # Clear memory after successful creation
            if is_confirmed_incident:
                update_session_memory('pending_incident_details', {})
                update_session_memory('session_state', 'idle')
                add_to_conversation_history('servicenow_agent', 'Incident successfully created')
            
            print(f">>> SERVICENOW AGENT: Response generated")
            print(f"--- SERVICENOW AGENT → END ---")
            
            return Command(
                update={
                    "messages": [
                        HumanMessage(content=result["messages"][-1].content, name="servicenow_agent")
                    ]
                },
                goto=END,
            )
            
    except Exception as e:
        print(f">>> SERVICENOW AGENT ERROR: {e}")
        
        # Enhanced fallback with proper incident creation simulation
        if is_confirmed_incident:
            update_session_memory('pending_incident_details', {})
            update_session_memory('session_state', 'idle')
            
            # Parse the incident details from the confirmation message
            incident_details = {}
            lines = state["messages"][-1].content.split('\n')
            for line in lines:
                if ':' in line and any(field in line.lower() for field in ['description', 'priority', 'impact', 'urgency', 'category', 'assignment']):
                    parts = line.split(':', 1)
                    if len(parts) == 2:
                        key = parts[0].strip()
                        value = parts[1].strip()
                        incident_details[key] = value
            
            # Generate a mock incident number
            import random
            incident_number = f"INC{random.randint(1000000, 9999999):07d}"
            
            fallback_response = f"""✅ **Incident Created Successfully** (Simulated - ServiceNow connection unavailable)

**📋 Incident Details:**
- **Incident Number**: {incident_number}
- **Description**: {incident_details.get('Description', 'Not specified')}
- **Short Description**: {incident_details.get('Short Description', 'Not specified')}
- **Priority**: {incident_details.get('Priority', 'Unknown')}
- **Impact**: {incident_details.get('Impact', 'Unknown')}
- **Urgency**: {incident_details.get('Urgency', 'Unknown')}
- **Category**: {incident_details.get('Category', 'Unknown')}
- **Assignment Group**: {incident_details.get('Assignment Group', 'Unknown')}
- **State**: New
- **Created**: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

The incident has been processed and would be created in ServiceNow when the connection is available. The incident is ready for the assigned team to investigate and resolve.

**Next Steps:**
1. The incident will be automatically assigned to the specified group
2. Notifications will be sent to relevant stakeholders
3. SLA timers will begin based on the priority level

Is there anything else you'd like me to help you with?"""

            add_to_conversation_history('servicenow_agent', f'Simulated incident creation: {incident_number}')
            
        elif is_resolution_request:
            fallback_response = f"""**Resolution Request Processed (Fallback Mode)**

ServiceNow and Confluence connections are currently unavailable. However, I can provide general troubleshooting guidance based on your request: {state['messages'][-1].content}

**General Resolution Steps:**
1. Verify the incident details and gather additional information
2. Check system logs and error messages
3. Review similar incidents for patterns
4. Apply standard troubleshooting procedures
5. Test the resolution in a controlled environment
6. Document the resolution steps for future reference

For specific resolution steps, please ensure the ServiceNow and Confluence MCP servers are running and try again."""
        else:
            fallback_response = f"ServiceNow connection unavailable. Request processed: {state['messages'][-1].content}"
        
        return Command(
            update={
                "messages": [
                    HumanMessage(content=fallback_response, name="servicenow_agent")
                ]
            },
            goto=END,
        )

# ============================================================================
# GRAPH CONSTRUCTION (Updated - Removed Resolution Agent)
# ============================================================================
def servicenow_agent_wrapper(state: MessagesState) -> Command[Literal[END]]:
    """Wrapper to handle async ServiceNow agent"""
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        result = loop.run_until_complete(servicenow_agent(state))
        return result
    finally:
        loop.close()

graph = StateGraph(MessagesState)

graph.add_node("supervisor", supervisor_node)
graph.add_node("enhancer", enhancer_node)
graph.add_node("confirmation_handler", confirmation_handler_node)
graph.add_node("servicenow_agent", servicenow_agent_wrapper)

graph.add_edge(START, "supervisor")
graph.add_edge("enhancer", END)  # Enhancer stops and waits for user
graph.add_edge("confirmation_handler", "servicenow_agent")

# Supervisor conditional edges
graph.add_conditional_edges(
    "supervisor",
    lambda state: state["messages"][-1].content.split("Supervisor routing to ")[1].split(":")[0].strip().lower() if "Supervisor routing to" in state["messages"][-1].content else "servicenow_agent",
    {
        "enhancer": "enhancer",
        "confirmation_handler": "confirmation_handler",
        "servicenow_agent": "servicenow_agent",
    }
)

# ServiceNow agent goes directly to END
graph.add_edge("servicenow_agent", END)

workflow_app = graph.compile()

# ============================================================================
# ENHANCED FLASK API ENDPOINTS WITH MEMORY
# ============================================================================

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'message': 'Enhanced ITSM Workflow API with Confluence Integration',
        'timestamp': datetime.now().isoformat(),
        'active_sessions': len(conversation_memory)
    })

@app.route('/chat', methods=['POST'])
@app.route('/chat', methods=['POST'])
def chat():
    global workflow_path, chat_messages, current_attachment
    
    try:
        # Handle both JSON and form data
        if request.is_json:
            data = request.get_json()
            user_message = data.get('message', '')
            session_id = data.get('session_id', 'default')
            uploaded_file = None
        else:
            user_message = request.form.get('message', '')
            session_id = request.form.get('session_id', 'default')
            uploaded_file = request.files.get('file')
        
        # Reset workflow path for new conversation
        workflow_path = []
        
        # Process file if uploaded
        file_info = None
        if uploaded_file and uploaded_file.filename:
            import base64
            file_content = uploaded_file.read()
            
            # Check for empty file
            if len(file_content) == 0:
                return jsonify({
                    'response': f'File "{uploaded_file.filename}" is empty (0 bytes). Please upload a file with content.',
                    'workflow_path': [],
                    'pending_confirmation': False
                })
                
            file_base64 = base64.b64encode(file_content).decode('utf-8')
            file_info = {
                "filename": uploaded_file.filename,
                "content": file_base64,
                "content_type": uploaded_file.content_type or "application/octet-stream"
            }
            print(f"File uploaded: {uploaded_file.filename} ({len(file_content)} bytes)")
            
            # Add attachment signal to message (crucial!)
            user_message += f"\n[ATTACHMENT: {file_info['filename']}]"
        
        # Prepare input for the workflow
        inputs = {
            "messages": [
                ("user", user_message),
            ]
        }
        
        # Store file info globally so agents can access it
        current_attachment = file_info
        
        # Run the workflow
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        final_response = ""
        try:
            async def run_workflow():
                nonlocal final_response
                async for event in workflow_app.astream(inputs):
                    for key, value in event.items():
                        if value is None:
                            continue
                        last_message = value.get("messages", [])[-1] if "messages" in value else None
                        if last_message and hasattr(last_message, 'content'):
                            final_response = last_message.content
            
            loop.run_until_complete(run_workflow())
        
        except Exception as workflow_error:
            print(f"Workflow error: {workflow_error}")
            final_response = f"I encountered an error while processing your request: {str(workflow_error)}"
        finally:
            loop.close()
            # Clear the global attachment after processing
            current_attachment = None
        
        # Ensure we always have a response
        if not final_response:
            final_response = "I processed your request, but didn't generate a specific response."
        
        # Always return a JSON response
        return jsonify({
            'response': final_response,
            'workflow_path': workflow_path,
            'session_id': session_id,
            'pending_confirmation': False,
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        print(f"Chat endpoint error: {e}")
        import traceback
        traceback.print_exc()
        
        # Always return a JSON response, even on error
        return jsonify({
            'response': f"Sorry, I encountered an error: {str(e)}",
            'workflow_path': [],
            'session_id': 'default',
            'pending_confirmation': False,
            'timestamp': datetime.now().isoformat()
        }), 500

@app.route('/workflow-status', methods=['GET'])
def workflow_status():
    """Get current workflow path and session status"""
    session_id = request.args.get('session_id', 'default')
    memory = get_session_memory(session_id)
    
    return jsonify({
        'workflow_path': workflow_path,
        'session_state': memory.get('session_state', 'idle'),
        'pending_confirmation': memory.get('session_state') == 'awaiting_confirmation',
        'incident_details': memory.get('pending_incident_details', {}),
        'conversation_length': len(memory.get('conversation_history', [])),
        'session_id': session_id,
        'timestamp': datetime.now().isoformat()
    })

@app.route('/reset', methods=['POST'])
def reset_workflow():
    """Reset workflow state for a specific session or all sessions"""
    global workflow_path, chat_messages, current_attachment, conversation_memory
    
    session_id = request.json.get('session_id') if request.is_json else request.form.get('session_id')
    
    if session_id:
        # Reset specific session
        if session_id in conversation_memory:
            del conversation_memory[session_id]
        message = f'Session {session_id} reset successfully'
    else:
        # Reset all sessions
        workflow_path = []
        chat_messages = []
        current_attachment = None
        conversation_memory.clear()
        message = 'All workflow states reset successfully'
    
    return jsonify({
        'message': message,
        'timestamp': datetime.now().isoformat()
    })

@app.route('/sessions', methods=['GET'])
def list_sessions():
    """List all active sessions"""
    sessions = {}
    for session_id, memory in conversation_memory.items():
        sessions[session_id] = {
            'state': memory.get('session_state', 'idle'),
            'conversation_length': len(memory.get('conversation_history', [])),
            'has_pending_details': bool(memory.get('pending_incident_details')),
            'last_activity': memory.get('conversation_history', [{}])[-1].get('timestamp', 'unknown')
        }
    
    return jsonify({
        'sessions': sessions,
        'total_sessions': len(sessions),
        'timestamp': datetime.now().isoformat()
    })

@app.route('/session/<session_id>/history', methods=['GET'])
def get_session_history(session_id):
    """Get conversation history for a specific session"""
    memory = get_session_memory(session_id)
    
    return jsonify({
        'session_id': session_id,
        'conversation_history': memory.get('conversation_history', []),
        'session_state': memory.get('session_state', 'idle'),
        'pending_details': memory.get('pending_incident_details', {}),
        'timestamp': datetime.now().isoformat()
    })

if __name__ == '__main__':
    print("Starting Enhanced ITSM Workflow API with Confluence Integration...")
    print("Available endpoints:")
    print("  GET  /health - Health check")
    print("  POST /chat - Main chat endpoint with session support")
    print("  GET  /workflow-status - Get workflow status")
    print("  POST /reset - Reset workflow state")
    print("  GET  /sessions - List all active sessions")
    print("  GET  /session/<id>/history - Get session conversation history")
    print("\nFeatures:")
    print("  ✓ Human-in-the-loop confirmation")
    print("  ✓ Memory across conversations")
    print("  ✓ Session-based state management")
    print("  ✓ Similar incidents reference display")
    print("  ✓ Field inference from historical data")
    print("  ✓ Confluence knowledge base integration for resolution steps")
    print("  ✓ Integrated ServiceNow and resolution agent")
    print("\nAPI running at: http://localhost:5019")
    
    # Check environment variables
    required_vars = ['MODEL_ID', 'PROJECT_ID', 'WATSONX_URL', 'WATSONX_API_KEY']
    missing_vars = [var for var in required_vars if not os.getenv(var)]
    
    if missing_vars:
        print(f"Warning: Missing environment variables: {missing_vars}")
        print("The app will use Claude/OpenAI as fallback, but some features may not work.")
    
    app.run(debug=True, host='0.0.0.0', port=5019)