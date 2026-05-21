FROM python:3.11-slim
WORKDIR /app
COPY src/services/feedback-learner/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY src/services/python_shared /app/python_shared
COPY src/services/feedback-learner/app ./app
ENV PYTHONPATH=/app
CMD ["python", "app/main.py"]
