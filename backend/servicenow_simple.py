"""
Simplified ITSM ServiceNow Agent with Wipro AI
- FIXED: Ensures tool calls complete before returning final response
- Uses official langchain-wiproai package
- LLM-driven decision making (no regex)
- Fast workflow execution
- Human-in-the-loop for incident/change creation approval
- Conversational memory support
- Proper tool calling implementation
"""

from typing import Dict, List
from langchain_core.messages import HumanMessage, AIMessage, BaseMessage, ToolMessage
from langgraph.graph import MessagesState
from langgraph.prebuilt import create_react_agent
import os
from dotenv import load_dotenv
from langchain_core.tools import tool
from pymilvus import connections, utility, Collection
from sentence_transformers import SentenceTransformer
from langchain_mcp_adapters.client import MultiServerMCPClient
import asyncio
from flask import Flask, request, jsonify
from datetime import datetime
from flask_cors import CORS
import base64
from langchain_wiproai import ChatWiproAI

load_dotenv()

# ============================================================================
# WIPRO AI LLM INITIALIZATION
# ============================================================================
llm = ChatWiproAI(
    model_name="gpt-4o",
    temperature=0.0,
    api_token=os.getenv(
        'WIPRO_API_TOKEN',
        "token|1f9419ee-81ef-4125-ba35-9549d01b2291|81d34a92182d2d1df66cb6ff5a6fe5c5f05a39cd540ba42399515a465d33b1a8"
    )
)

# Flask app
app = Flask(__name__)
CORS(app)

# Global state - Session memory
conversation_memory: Dict[str, List[BaseMessage]] = {}
pending_approval: Dict[str, Dict] = {}
current_attachment = None

# ============================================================================
# MILVUS RETRIEVAL TOOLS - FETCHES ALL FIELDS
# ============================================================================

@tool
def search_similar_incidents(description: str) -> str:
    """Search for similar historical incidents in Milvus based on description.
    Returns ALL available fields from the incident record."""
    MILVUS_HOST = os.getenv('MILVUS_HOST', "172.17.204.5")
    MILVUS_PORT = os.getenv('MILVUS_PORT', "19530")
    COLLECTION_NAME = "incident_history"

    try:
        connections.connect(alias="default", host=MILVUS_HOST, port=MILVUS_PORT)
        if not utility.has_collection(COLLECTION_NAME):
            return "No incident history available."

        collection = Collection(COLLECTION_NAME)
        collection.load()

        model = SentenceTransformer(os.getenv('EMBEDDING_MODEL', "all-MiniLM-L6-v2"))
        query_embedding = model.encode([description]).tolist()

        # Get ALL available fields from collection schema (except embedding and id)
        schema = collection.schema
        output_fields = [field.name for field in schema.fields if field.name not in ["embedding", "id"]]

        print(f"[Milvus] Fetching ALL {len(output_fields)} fields for incidents")

        results = collection.search(
            query_embedding,
            "embedding",
            {"metric_type": "COSINE", "params": {"nprobe": 10}},
            limit=3,
            output_fields=output_fields
        )

        if not results[0]:
            return "No similar incidents found."

        matches = []
        for idx, hit in enumerate(results[0], 1):
            entity = hit.entity
            incident_number = entity.get('number', f'Incident #{idx}')

            match_parts = [
                f"{'='*70}",
                f"SIMILAR INCIDENT #{idx}: {incident_number}",
                f"Similarity Score: {hit.score:.2%}",
                f"{'='*70}",
                ""
            ]

            for field in output_fields:
                if field == 'number':
                    continue
                
                value = entity.get(field, 'NA')
                field_name = field.replace('_', ' ').title()

                long_text_fields = ['description', 'short_description', 'correlation_display', 
                                   'work_notes', 'comments', 'close_notes', 'resolution_notes']
                
                if field in long_text_fields and value and value != 'NA' and len(str(value)) > 50:
                    match_parts.append(f"\n**{field_name}**:")
                    match_parts.append(f"{value}")
                else:
                    match_parts.append(f"**{field_name}**: {value}")

            matches.append("\n".join(match_parts))

        connections.disconnect("default")
        return "\n\n".join(matches)

    except Exception as e:
        print(f"[Milvus Error] {e}")
        return f"Error searching incidents: {str(e)}"


@tool
def search_similar_change_requests(description: str) -> str:
    """Search for similar historical change requests in Milvus.
    Returns ALL available fields from the change request record."""
    MILVUS_HOST = os.getenv('MILVUS_HOST', "172.17.204.5")
    MILVUS_PORT = os.getenv('MILVUS_PORT', "19530")
    COLLECTION_NAME = "change_request_history"

    try:
        connections.connect(alias="default", host=MILVUS_HOST, port=MILVUS_PORT)
        if not utility.has_collection(COLLECTION_NAME):
            return "No change request history available."

        collection = Collection(COLLECTION_NAME)
        collection.load()

        model = SentenceTransformer(os.getenv('EMBEDDING_MODEL', "all-MiniLM-L6-v2"))
        query_embedding = model.encode([description]).tolist()

        schema = collection.schema
        output_fields = [field.name for field in schema.fields if field.name not in ["embedding", "id"]]

        print(f"[Milvus] Fetching ALL {len(output_fields)} fields for change requests")

        results = collection.search(
            query_embedding,
            "embedding",
            {"metric_type": "COSINE", "params": {"nprobe": 10}},
            limit=3,
            output_fields=output_fields
        )

        if not results[0]:
            return "No similar change requests found."

        matches = []
        for idx, hit in enumerate(results[0], 1):
            entity = hit.entity
            change_number = entity.get('number', f'Change Request #{idx}')

            match_parts = [
                f"{'='*70}",
                f"SIMILAR CHANGE REQUEST #{idx}: {change_number}",
                f"Similarity Score: {hit.score:.2%}",
                f"{'='*70}",
                ""
            ]

            for field in output_fields:
                if field == 'number':
                    continue
                
                value = entity.get(field, 'NA')
                field_name = field.replace('_', ' ').title()

                long_text_fields = ['description', 'short_description', 'justification', 
                                   'implementation_plan', 'backout_plan', 'test_plan', 
                                   'risk_impact_analysis', 'change_plan']
                
                if field in long_text_fields and value and value != 'NA' and len(str(value)) > 50:
                    match_parts.append(f"\n**{field_name}**:")
                    match_parts.append(f"{value}")
                else:
                    match_parts.append(f"**{field_name}**: {value}")

            matches.append("\n".join(match_parts))

        connections.disconnect("default")
        return "\n\n".join(matches)

    except Exception as e:
        print(f"[Milvus Error] {e}")
        return f"Error searching change requests: {str(e)}"


# ============================================================================
# HELPER FUNCTION TO EXTRACT FINAL AI MESSAGE
# ============================================================================

def extract_final_response(messages: List[BaseMessage]) -> str:
    """
    Extract the final AI response from the message list.
    Ensures we skip intermediate tool call messages and get the actual response.
    """
    # Start from the end and look for the last AIMessage that's not a tool call
    for msg in reversed(messages):
        if isinstance(msg, AIMessage):
            # Check if this is a tool call message
            if hasattr(msg, 'tool_calls') and msg.tool_calls:
                # This is a tool call initiation, skip it
                continue
            
            # Check if content looks like a tool call description
            content = str(msg.content)
            if content.startswith("Called tool:") or content.startswith("\nCalled tool:"):
                # Skip tool call descriptions
                continue
            
            # This is a real response
            if content and len(content.strip()) > 0:
                return content
    
    # Fallback: return the last AIMessage content
    for msg in reversed(messages):
        if isinstance(msg, AIMessage) and msg.content:
            return str(msg.content)
    
    return "I processed your request but didn't generate a response. Please try again."


# ============================================================================
# MAIN AGENT
# ============================================================================

async def main_agent(state: MessagesState, session_id: str = "default") -> Dict:
    """Main ITSM agent that handles all requests"""

    global pending_approval, current_attachment, conversation_memory

    system_prompt = """You are a helpful ITSM ServiceNow assistant. Your job is to help users with ServiceNow operations.

**CRITICAL RULES:**
1. When a user asks for information (incident details, resolution steps, etc.), you MUST call the appropriate tool immediately
2. Do NOT just say you will do something - actually do it by calling the tool
3. After calling a tool, ALWAYS wait for the result and then provide a summary to the user
4. Never stop after just calling a tool - always provide the final response
5. **CRITICAL FOR MILVUS RESULTS**: When you receive search results from search_similar_incidents or search_similar_change_requests tools, you MUST display ALL fields returned in the search results. DO NOT truncate, summarize, or skip any fields. Show the COMPLETE data including full text of Implementation Plans, Backout Plans, Test Plans, Justifications, Descriptions, etc.

**Common Workflows:**

**Getting Incident/Change Details:**
- User asks: "get details of incident INC123" 
- You do: Call get_record tool immediately with the incident number
- Then: Summarize the results for the user

**Getting Resolution Steps:**
- User asks: "resolution steps for INC123"
- Step 1: Call get_record to fetch the incident
- Step 2: Extract the description/problem from the incident
- Step 3: Call searchConfluenceUsingCql with the description to find KB articles
- Step 4: Present the resolution steps from the KB articles

**Creating Incidents (FOLLOW THIS FORMAT EXACTLY):**
When a user wants to create an incident:
1. Call search_similar_incidents with the description
2. After receiving the COMPLETE results from Milvus (which includes ALL fields), format your response EXACTLY like this:

Based on your incident description, I found similar historical incidents and inferred the missing details:

**📋 PROPOSED INCIDENT DETAILS:**
- **Description**: [user's description]
- **Short Description**: [user's description or inferred]
- **Priority**: [number] (inferred from similar incidents)
- **Impact**: [number] (inferred from similar incidents)
- **Urgency**: [number] (inferred from similar incidents)
- **Category**: [value] (inferred from similar incidents)
- **Subcategory**: [value] (inferred from similar incidents)
- **Assignment Group**: [value] (inferred from similar incidents)
- **Caller**: [value] (inferred from similar incidents)
- **Service**: [value] (inferred from similar incidents)
- **Service Offering**: [value] (inferred from similar incidents)
- **Configuration Item**: [value] (inferred from similar incidents)
- **IP Address**: [value] (inferred from similar incidents)
- **Instance Name**: [value] (inferred from similar incidents)
- **Database Version**: [value] (inferred from similar incidents)
- **Company**: [value] (inferred from similar incidents)

**📚 REFERENCE INCIDENTS USED FOR INFERENCE:**

CRITICAL: You MUST include the COMPLETE Milvus search results here. DO NOT summarize or truncate.
For EACH similar incident found, display:

**Incident #X: [INC Number]**
Similarity Score: [score]

Then list EVERY SINGLE FIELD returned from Milvus including but not limited to:
- Number
- Opened
- Short Description
- Description (FULL TEXT - DO NOT TRUNCATE)
- Caller
- Priority
- State
- Category
- Subcategory
- Assignment Group
- Assigned To
- Updated
- Updated By
- Correlation Display (FULL TEXT if present)
- Correlation ID
- Service
- Service Offering
- Configuration Item
- Impact
- Urgency
- IP Address
- Instance Name
- Database Version
- Company

And ANY OTHER fields present in the search results. Show them ALL.

**❓ CONFIRMATION REQUIRED:**
Please review the proposed details and respond with:
- "Yes" or "Create it" to proceed
- "Change [field] to [value]" to modify
- "Cancel" to cancel

**⏳ I'm waiting for your confirmation before creating the incident.**

3. When user confirms, call create_incident tool and WAIT for the result
4. After the tool returns, summarize the created incident details to the user

**Creating Change Requests (FOLLOW THIS FORMAT EXACTLY):**
When a user wants to create a change request:
1. Call search_similar_change_requests with the description
2. After receiving the COMPLETE results from Milvus (which includes ALL fields), format your response EXACTLY like this:

Based on your change request description, I found similar historical change requests and inferred the missing details:

**📋 PROPOSED CHANGE REQUEST DETAILS:**
- **Description**: [user's description]
- **Short Description**: [user's description or inferred]
- **Type**: [value] (inferred from similar change requests)
- **Priority**: [number] (inferred from similar change requests)
- **Impact**: [number] (inferred from similar change requests)
- **Urgency**: [number] (inferred from similar change requests)
- **Risk**: [value] (inferred from similar change requests)
- **Category**: [value] (inferred from similar change requests)
- **Assignment Group**: [value] (inferred from similar change requests)
- **Service**: [value] (inferred from similar change requests)
- **Service Offering**: [value] (inferred from similar change requests)
- **Configuration Item**: [value] (inferred from similar change requests)
- **Model**: [value] (inferred from similar change requests)
- **Requested By**: [value] (inferred from similar change requests)
- **Justification**: [FULL TEXT from similar change requests]
- **Implementation Plan**: [FULL TEXT from similar change requests]
- **Backout Plan**: [FULL TEXT from similar change requests]
- **Test Plan**: [FULL TEXT from similar change requests]
- **Risk Impact Analysis**: [FULL TEXT from similar change requests]

**📚 REFERENCE CHANGE REQUESTS USED FOR INFERENCE:**

CRITICAL: You MUST include the COMPLETE Milvus search results here. DO NOT summarize or truncate. 
For EACH similar change request found, display:

**Change Request #X: [CHG Number]**
Similarity Score: [score]

Then list EVERY SINGLE FIELD returned from Milvus including but not limited to:
- Number
- Short Description
- Description (FULL TEXT)
- Type
- State
- Impact
- Urgency
- Priority
- Risk
- Category
- Assignment Group
- Assigned To
- Requested By
- Service
- Service Offering
- Configuration Item
- Model
- Justification (FULL TEXT - DO NOT TRUNCATE)
- Implementation Plan (FULL TEXT - DO NOT TRUNCATE)
- Backout Plan (FULL TEXT - DO NOT TRUNCATE)
- Test Plan (FULL TEXT - DO NOT TRUNCATE)
- Risk Impact Analysis (FULL TEXT - DO NOT TRUNCATE)

And ANY OTHER fields present in the search results.

**❓ CONFIRMATION REQUIRED:**
Please review the proposed details and respond with:
- "Yes" or "Create it" to proceed with these details
- "Change [field] to [value]" to modify (e.g., "Change risk to High")
- "Cancel" to cancel the change request creation

**⏳ I'm waiting for your confirmation before creating the change request.**

3. When user confirms, call create_change_request and WAIT for the result
4. After the tool returns, summarize the created change request details to the user

**IMPORTANT**: 
- After calling ANY tool, you MUST wait for the result and provide a final summary
- Never leave the user with just "Called tool: xyz"
- When displaying Milvus search results, show ALL fields without truncation
- DO NOT summarize the Implementation Plan, Backout Plan, Test Plan, or Justification - show them in FULL"""

    try:
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
            snow_tools = client.get_tools()
            all_tools = snow_tools + [search_similar_incidents, search_similar_change_requests]

            print(f"\n[Agent] Loaded {len(all_tools)} tools")
            print(f"[Agent] User message: {state['messages'][-1].content}")

            # Get conversation history for this session
            if session_id not in conversation_memory:
                conversation_memory[session_id] = []
            
            conversation_memory[session_id].extend(state['messages'])
            conversation_memory[session_id] = conversation_memory[session_id][-20:]
            
            full_state = {
                "messages": conversation_memory[session_id]
            }

            # Create agent with proper tool binding
            agent = create_react_agent(
                llm, 
                all_tools, 
                state_modifier=system_prompt,
            )

            # Run agent with recursion limit to ensure completion
            print(f"[Agent] Starting agent execution...")
            result = await agent.ainvoke(
                full_state,
                config={
                    "recursion_limit": 50,  # Allow multiple tool call iterations
                }
            )
            
            # Update conversation memory with results
            conversation_memory[session_id] = result['messages']
            
            print(f"[Agent] Agent completed. Message count: {len(result['messages'])}")
            
            # Debug: print last few messages with types
            for i, msg in enumerate(result['messages'][-5:]):
                msg_type = type(msg).__name__
                content_preview = str(msg.content)[:100] if hasattr(msg, 'content') else 'no content'
                has_tool_calls = hasattr(msg, 'tool_calls') and msg.tool_calls
                print(f"[Agent] Message {i} ({msg_type}, tool_calls={has_tool_calls}): {content_preview}")

            return result

    except Exception as e:
        print(f"[Agent] Error: {e}")
        import traceback
        traceback.print_exc()

        return {
            "messages": [
                AIMessage(content=f"I encountered an error: {str(e)}\n\nPlease make sure ServiceNow/Confluence connections are working properly.")
            ]
        }


# ============================================================================
# FLASK API
# ============================================================================

@app.route('/health', methods=['GET'])
def health():
    return jsonify({
        'status': 'healthy',
        'service': 'ITSM ServiceNow Agent with Wipro AI - FIXED VERSION',
        'timestamp': datetime.now().isoformat(),
        'active_sessions': len(conversation_memory)
    })


@app.route('/chat', methods=['POST'])
def chat():
    global current_attachment

    try:
        # Get request data
        if request.is_json:
            data = request.get_json()
            user_message = data.get('message', '')
            session_id = data.get('session_id', 'default')
            uploaded_file = None
        else:
            user_message = request.form.get('message', '')
            session_id = request.form.get('session_id', 'default')
            uploaded_file = request.files.get('file')

        # Handle file upload
        if uploaded_file and uploaded_file.filename:
            file_content = uploaded_file.read()
            if len(file_content) == 0:
                return jsonify({'response': 'File is empty.', 'timestamp': datetime.now().isoformat()})

            current_attachment = {
                "filename": uploaded_file.filename,
                "content": base64.b64encode(file_content).decode('utf-8'),
                "content_type": uploaded_file.content_type or "application/octet-stream"
            }
            user_message += f"\n[File attached: {uploaded_file.filename}]"

        print(f"\n{'='*60}")
        print(f"[Chat] User: {user_message}")
        print(f"[Chat] Session: {session_id}")
        print(f"{'='*60}")

        # Prepare state
        state = {
            "messages": [HumanMessage(content=user_message)]
        }

        # Run agent
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)

        try:
            result = loop.run_until_complete(main_agent(state, session_id))
            
            # Extract the final AI message using improved logic
            final_message = extract_final_response(result["messages"])
            
            print(f"\n[Chat] Final response extracted: {final_message[:200]}...")
            
        except Exception as e:
            print(f"[Chat] Workflow error: {e}")
            import traceback
            traceback.print_exc()
            final_message = f"I encountered an error while processing your request: {str(e)}"
        finally:
            loop.close()
            current_attachment = None

        return jsonify({
            'response': final_message,
            'session_id': session_id,
            'timestamp': datetime.now().isoformat()
        })

    except Exception as e:
        print(f"[Chat] Error: {e}")
        import traceback
        traceback.print_exc()

        return jsonify({
            'response': f"Error: {str(e)}",
            'timestamp': datetime.now().isoformat()
        }), 500


@app.route('/reset', methods=['POST'])
def reset():
    global pending_approval, current_attachment, conversation_memory
    
    data = request.get_json() if request.is_json else {}
    session_id = data.get('session_id', 'default')
    
    if session_id == 'all':
        conversation_memory = {}
        pending_approval = {}
        message = 'All sessions reset successfully'
    else:
        if session_id in conversation_memory:
            del conversation_memory[session_id]
        if session_id in pending_approval:
            del pending_approval[session_id]
        message = f'Session {session_id} reset successfully'
    
    current_attachment = None
    
    return jsonify({
        'message': message,
        'timestamp': datetime.now().isoformat()
    })


@app.route('/sessions', methods=['GET'])
def get_sessions():
    """Get list of active sessions"""
    sessions = []
    for session_id, messages in conversation_memory.items():
        sessions.append({
            'session_id': session_id,
            'message_count': len(messages),
            'last_message': messages[-1].content[:100] if messages else None
        })
    
    return jsonify({
        'sessions': sessions,
        'total_sessions': len(sessions),
        'timestamp': datetime.now().isoformat()
    })


if __name__ == '__main__':
    print("=" * 60)
    print("ITSM ServiceNow Agent with Wipro AI - FIXED VERSION")
    print("=" * 60)
    print("Features:")
    print("  ✓ Official langchain-wiproai package integration")
    print("  ✓ Proper tool calling support")
    print("  ✓ LLM-driven decision making")
    print("  ✓ Multi-step workflow execution")
    print("  ✓ Conversational memory per session")
    print("  ✓ Formatted incident creation workflow")
    print("  ✓ Milvus vector search integration")
    print("  ✓ ServiceNow MCP integration")
    print("  ✓ FETCHES ALL FIELDS from Milvus")
    print("  ✓ FIXED: Ensures tool calls complete before returning")
    print("=" * 60)
    print("API: http://localhost:5019")
    print("Endpoints:")
    print("  - POST /chat - Send messages (with session_id)")
    print("  - POST /reset - Reset session (optionally pass session_id)")
    print("  - GET /health - Health check")
    print("  - GET /sessions - List active sessions")
    print("=" * 60)

    app.run(debug=True, host='0.0.0.0', port=5019)
