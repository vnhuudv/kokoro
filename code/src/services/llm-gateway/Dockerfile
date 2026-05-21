FROM python:3.11-slim
WORKDIR /app
COPY src/services/llm-gateway/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY src/services/python_shared /app/python_shared
COPY src/services/llm-gateway/app ./app
ENV PYTHONPATH=/app
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8002", "--reload"]
