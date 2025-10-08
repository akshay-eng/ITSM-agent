# Use Python 3.11 slim image as base
FROM python:3.11-slim

# Set working directory
WORKDIR /workspace

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy the entire servicenow-mcp folder
COPY . /workspace/

# Create and setup virtual environment for MCP server
RUN python -m venv /workspace/.venv
ENV PATH="/workspace/.venv/bin:$PATH"

# Install MCP server requirements
RUN pip install --no-cache-dir -r requirements.txt

# Create and setup virtual environment for Flask app
RUN python -m venv /workspace/app/.venv
ENV APP_VENV_PATH="/workspace/app/.venv"

# Install Flask app requirements
RUN /workspace/app/.venv/bin/pip install --no-cache-dir -r /workspace/app/requirements.txt

# Create a startup script
RUN echo '#!/bin/bash\n\
set -e\n\
\n\
# Start MCP server in background\n\
echo "Starting MCP server..."\n\
source /workspace/.venv/bin/activate\n\
python -m mcp_server_servicenow.cli \\\n\
  --url "${SERVICENOW_URL}" \\\n\
  --username "${SERVICENOW_USERNAME}" \\\n\
  --password "${SERVICENOW_PASSWORD}" \\\n\
  --transport "${SERVICENOW_TRANSPORT:-sse}" &\n\
\n\
MCP_PID=$!\n\
echo "MCP server started with PID: $MCP_PID"\n\
\n\
# Wait a bit for MCP server to start\n\
sleep 5\n\
\n\
# Start Flask app\n\
echo "Starting Flask app..."\n\
cd /workspace/app\n\
source /workspace/app/.venv/bin/activate\n\
python app.py &\n\
\n\
FLASK_PID=$!\n\
echo "Flask app started with PID: $FLASK_PID"\n\
\n\
# Function to handle shutdown\n\
shutdown() {\n\
  echo "Shutting down..."\n\
  kill $MCP_PID $FLASK_PID 2>/dev/null || true\n\
  wait\n\
  exit 0\n\
}\n\
\n\
# Trap signals\n\
trap shutdown SIGTERM SIGINT\n\
\n\
# Wait for processes\n\
wait' > /workspace/start.sh

# Make startup script executable
RUN chmod +x /workspace/start.sh

# Expose ports
EXPOSE 8000 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:5000/health || exit 1

# Add a simple health endpoint to your Flask app by creating a health check
RUN echo 'from flask import Flask\n\
app = Flask(__name__)\n\
\n\
@app.route("/health")\n\
def health():\n\
    return {"status": "healthy"}, 200' >> /workspace/app/health.py

# Set environment variables
ENV PYTHONPATH="/workspace:/workspace/app"
ENV FLASK_ENV=production

# Run the startup script
CMD ["/workspace/start.sh"]