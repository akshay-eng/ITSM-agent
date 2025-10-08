import json
from pymilvus import connections, Collection, FieldSchema, CollectionSchema, DataType
from sentence_transformers import SentenceTransformer
from pymilvus import utility

# Milvus Config - try localhost if running locally
MILVUS_HOST = "172.17.204.5"  # or "127.0.0.1"
MILVUS_PORT = "19530"
COLLECTION_NAME = "incident_history"
EMBEDDING_MODEL = "all-MiniLM-L6-v2"

# Connect to Milvus with error handling
try:
    connections.connect(
         "default",
        host=MILVUS_HOST, 
        port=MILVUS_PORT,
        timeout=10  # Add timeout
    )
    print(f"✅ Connected to Milvus at {MILVUS_HOST}:{MILVUS_PORT}")
except Exception as e:
    print(f"❌ Failed to connect to Milvus: {e}")
    print("Please check:")
    print("1. Is Milvus server running?")
    print("2. Is the host/port correct?")
    print("3. Are there firewall restrictions?")
    exit(1)

# Load model
model = SentenceTransformer(EMBEDDING_MODEL)

# Define schema - updated for ServiceNow incident fields
fields = [
    FieldSchema(name="id", dtype=DataType.INT64, is_primary=True, auto_id=True),
    FieldSchema(name="number", dtype=DataType.VARCHAR, max_length=50),
    FieldSchema(name="short_description", dtype=DataType.VARCHAR, max_length=500),
    FieldSchema(name="description", dtype=DataType.VARCHAR, max_length=2000),
    FieldSchema(name="priority", dtype=DataType.VARCHAR, max_length=50),
    FieldSchema(name="state", dtype=DataType.VARCHAR, max_length=50),
    FieldSchema(name="category", dtype=DataType.VARCHAR, max_length=100),
    FieldSchema(name="impact", dtype=DataType.VARCHAR, max_length=50),
    FieldSchema(name="urgency", dtype=DataType.VARCHAR, max_length=50),
    FieldSchema(name="severity", dtype=DataType.VARCHAR, max_length=50),
    FieldSchema(name="opened", dtype=DataType.VARCHAR, max_length=50),
    FieldSchema(name="opened_by", dtype=DataType.VARCHAR, max_length=100),
    FieldSchema(name="embedding", dtype=DataType.FLOAT_VECTOR, dim=384)
]

schema = CollectionSchema(fields, description="ServiceNow incidents with embeddings")

# Drop if exists and create new
if utility.has_collection("incident_history"):
    Collection("incident_history").drop()

collection = Collection(name=COLLECTION_NAME, schema=schema)

# Create index
index_params = {
    "index_type": "IVF_FLAT",
    "metric_type": "COSINE",
    "params": {"nlist": 128}
}

collection.create_index(
    field_name="embedding",
    index_params=index_params
)

# Load the collection
collection.load()

# Function to parse priority/impact/urgency values to get numeric part
def parse_priority_field(field_value):
    """Extract numeric value from fields like '1 - Critical' or return default"""
    if field_value and field_value != "NA":
        try:
            return int(field_value.split(' - ')[0])
        except:
            return 1
    return 1

# Load data from ServiceNow JSON
with open("E:\\chatops-repo\\blcpdev1\\chatops\\OnPrem\\pre-process\\processed_data\\xlconversion\\incident_snow.json") as f:
    data = json.load(f)

# Prepare data lists
numbers = []
short_descriptions = []
descriptions = []
priorities = []
states = []
categories = []
impacts = []
urgencies = []
severities = []
openeds = []
opened_bys = []
embeddings = []

for item in data:
    # Create text for embedding from key fields
    embedding_text = f"{item.get('Short description', '')}. {item.get('Description', '')}. Category: {item.get('Category', '')}. Priority: {item.get('Priority', '')}"
    
    # Generate embedding
    emb = model.encode(embedding_text).tolist()
    
    # Extract data with fallbacks for missing values
    numbers.append(item.get("Number", ""))
    short_descriptions.append(item.get("Short description", ""))
    descriptions.append(item.get("Description", ""))
    priorities.append(item.get("Priority", ""))
    states.append(item.get("State", ""))
    categories.append(item.get("Category", ""))
    impacts.append(item.get("Impact", ""))
    urgencies.append(item.get("Urgency", ""))
    severities.append(item.get("Severity", ""))
    openeds.append(item.get("Opened", ""))
    opened_bys.append(item.get("Opened by", ""))
    embeddings.append(emb)

# Insert data
entities = [
    numbers,
    short_descriptions, 
    descriptions,
    priorities,
    states,
    categories,
    impacts,
    urgencies,
    severities,
    openeds,
    opened_bys,
    embeddings
]

collection.insert(entities)
print(f"✅ Inserted {len(numbers)} ServiceNow incidents into Milvus collection '{COLLECTION_NAME}'")

# Optional: Print some stats
print(f"Sample incident: {numbers[0]} - {short_descriptions[0]}")
print(f"Collection stats: {collection.num_entities} entities")