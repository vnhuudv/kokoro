FROM python:3.11-slim
WORKDIR /app
COPY src/services/annotation-pipeline/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY src/services/python_shared /app/python_shared
COPY src/services/annotation-pipeline/app ./app
ENV PYTHONPATH=/app
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8001", "--reload"]
