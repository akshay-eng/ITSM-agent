import json
from pymilvus import connections, Collection, FieldSchema, CollectionSchema, DataType
from sentence_transformers import SentenceTransformer
from pymilvus import utility

# Milvus Config
MILVUS_HOSTS = ["172.17.204.5", "127.0.0.1"]  # Try multiple hosts
MILVUS_PORT = "19530"
COLLECTION_NAME = "change_request_history"
EMBEDDING_MODEL = "all-MiniLM-L6-v2"

# Connect to Milvus with error handling and fallback hosts
connection_successful = False
for host in MILVUS_HOSTS:
    try:
        print(f"Trying to connect to {host}:{MILVUS_PORT}")
        connections.connect(
            alias="default",
            host=host, 
            port=MILVUS_PORT,
            timeout=10
        )
        print(f"✅ Connected to Milvus at {host}:{MILVUS_PORT}")
        MILVUS_HOST = host  # Store successful host for later use
        connection_successful = True
        break
    except Exception as e:
        print(f"❌ Failed to connect to {host}:{MILVUS_PORT}: {e}")
        continue

if not connection_successful:
    print("❌ Could not connect to Milvus on any host")
    print("Please check:")
    print("1. Container health: docker ps")
    print("2. Container logs: docker logs milvus-standalone") 
    print("3. Try restarting: docker restart milvus-standalone")
    exit(1)

# Load model
model = SentenceTransformer(EMBEDDING_MODEL)

# Define schema for Change Requests
fields = [
    FieldSchema(name="id", dtype=DataType.INT64, is_primary=True, auto_id=True),
    FieldSchema(name="number", dtype=DataType.VARCHAR, max_length=50),
    FieldSchema(name="short_description", dtype=DataType.VARCHAR, max_length=500),
    FieldSchema(name="description", dtype=DataType.VARCHAR, max_length=3000),
    FieldSchema(name="type", dtype=DataType.VARCHAR, max_length=50),
    FieldSchema(name="state", dtype=DataType.VARCHAR, max_length=50),
    FieldSchema(name="impact", dtype=DataType.VARCHAR, max_length=50),
    FieldSchema(name="urgency", dtype=DataType.VARCHAR, max_length=50),
    FieldSchema(name="priority", dtype=DataType.VARCHAR, max_length=50),
    FieldSchema(name="requested_by", dtype=DataType.VARCHAR, max_length=100),
    FieldSchema(name="assigned_to", dtype=DataType.VARCHAR, max_length=100),
    FieldSchema(name="assignment_group", dtype=DataType.VARCHAR, max_length=100),
    FieldSchema(name="configuration_item", dtype=DataType.VARCHAR, max_length=200),
    FieldSchema(name="planned_start_date", dtype=DataType.VARCHAR, max_length=50),
    FieldSchema(name="planned_end_date", dtype=DataType.VARCHAR, max_length=50),
    FieldSchema(name="change_plan", dtype=DataType.VARCHAR, max_length=2000),
    FieldSchema(name="backout_plan", dtype=DataType.VARCHAR, max_length=2000),
    FieldSchema(name="test_plan", dtype=DataType.VARCHAR, max_length=2000),
    FieldSchema(name="implementation_plan", dtype=DataType.VARCHAR, max_length=2000),
    FieldSchema(name="justification", dtype=DataType.VARCHAR, max_length=2000),
    FieldSchema(name="cab_required", dtype=DataType.BOOL),
    FieldSchema(name="created_by", dtype=DataType.VARCHAR, max_length=100),
    FieldSchema(name="closed_by", dtype=DataType.VARCHAR, max_length=100),
    FieldSchema(name="domain", dtype=DataType.VARCHAR, max_length=50),
    FieldSchema(name="embedding", dtype=DataType.FLOAT_VECTOR, dim=384)
]

schema = CollectionSchema(fields, description="ServiceNow Change Requests with embeddings")

# Drop if exists and create new
if utility.has_collection(COLLECTION_NAME):
    Collection(COLLECTION_NAME).drop()
    print(f"Dropped existing collection: {COLLECTION_NAME}")

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

# Load data from ServiceNow Change Request JSON
# Update this path to your change request JSON file
json_file_path = "E:\\stack-overflow-scraping\\snow\\change_request_data.json"

try:
    with open(json_file_path) as f:
        data = json.load(f)
except FileNotFoundError:
    print(f"❌ File not found: {json_file_path}")
    print("Please update the json_file_path variable to point to your change request JSON file")
    exit(1)

# Prepare data lists
numbers = []
short_descriptions = []
descriptions = []
types = []
states = []
impacts = []
urgencies = []
priorities = []
requested_bys = []
assigned_tos = []
assignment_groups = []
configuration_items = []
planned_start_dates = []
planned_end_dates = []
change_plans = []
backout_plans = []
test_plans = []
implementation_plans = []
justifications = []
cab_requireds = []
created_bys = []
closed_bys = []
domains = []
embeddings = []

print("Processing Change Request data...")

for i, item in enumerate(data):
    # Create comprehensive text for embedding from key fields
    embedding_text_parts = [
        item.get('Short description', ''),
        item.get('Description', ''),
        item.get('Type', ''),
        item.get('Configuration item', ''),
        item.get('Change plan', ''),
        item.get('Justification', ''),
        item.get('Implementation plan', ''),
        item.get('Backout plan', ''),
        item.get('Test plan', '')
    ]
    
    # Filter out empty parts and join
    embedding_text = '. '.join([part for part in embedding_text_parts if part and part != 'NA'])
    
    # Generate embedding
    emb = model.encode(embedding_text).tolist()
    
    # Extract data with fallbacks for missing values
    numbers.append(item.get("Number", ""))
    short_descriptions.append(item.get("Short description", ""))
    descriptions.append(item.get("Description", ""))
    types.append(item.get("Type", ""))
    states.append(item.get("State", ""))
    impacts.append(item.get("Impact", ""))
    urgencies.append(item.get("Urgency", ""))
    priorities.append(item.get("Priority", ""))  # Some change requests might have priority
    requested_bys.append(item.get("Requested by", ""))
    assigned_tos.append(item.get("Assigned to", ""))
    assignment_groups.append(item.get("Assignment group", ""))
    configuration_items.append(item.get("Configuration item", ""))
    planned_start_dates.append(item.get("Planned start date", ""))
    planned_end_dates.append(item.get("Planned end date", ""))
    change_plans.append(item.get("Change plan", ""))
    backout_plans.append(item.get("Backout plan", ""))
    test_plans.append(item.get("Test plan", ""))
    implementation_plans.append(item.get("Implementation plan", ""))
    justifications.append(item.get("Justification", ""))
    cab_requireds.append(bool(item.get("CAB required", False)))
    created_bys.append(item.get("Created by", ""))
    closed_bys.append(item.get("Closed by", ""))
    domains.append(item.get("Domain", ""))
    embeddings.append(emb)
    
    if (i + 1) % 10 == 0:
        print(f"Processed {i + 1} change requests...")

# Insert data
entities = [
    numbers,
    short_descriptions,
    descriptions,
    types,
    states,
    impacts,
    urgencies,
    priorities,
    requested_bys,
    assigned_tos,
    assignment_groups,
    configuration_items,
    planned_start_dates,
    planned_end_dates,
    change_plans,
    backout_plans,
    test_plans,
    implementation_plans,
    justifications,
    cab_requireds,
    created_bys,
    closed_bys,
    domains,
    embeddings
]

try:
    collection.insert(entities)
    print(f"✅ Successfully inserted {len(numbers)} ServiceNow Change Requests into Milvus collection '{COLLECTION_NAME}'")
    
    # Print some stats
    print(f"\nSample Change Request: {numbers[0]} - {short_descriptions[0]}")
    print(f"Collection stats: {collection.num_entities} entities")
    
    # Print schema info
    print(f"\nCollection schema created with fields:")
    for field in fields:
        if field.name != "embedding":
            print(f"  - {field.name}: {field.dtype}")
    
except Exception as e:
    print(f"❌ Error inserting data: {e}")
    exit(1)

print(f"\n🎉 Change Request data successfully loaded into Milvus!")
print(f"You can now search for similar change requests using the collection: '{COLLECTION_NAME}'")