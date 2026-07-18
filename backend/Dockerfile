FROM ubuntu:22.04

WORKDIR /app

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y \
    python3.10 \
    python3-pip \
    python3.10-dev \
    gcc \
    g++ \
    libgl1 \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

RUN ln -s /usr/bin/python3.10 /usr/bin/python

COPY requirements.txt .

RUN pip3 install --no-cache-dir --upgrade pip
RUN pip3 install --no-cache-dir torch==2.0.1 torchvision==0.15.2 --index-url https://download.pytorch.org/whl/cpu
RUN pip3 install --no-cache-dir ultralytics==8.0.207
RUN pip3 install --no-cache-dir -r requirements.txt

COPY . .

RUN mkdir -p /app/models /app/data/images /app/data/annotations /app/data/training_images /app/data/training_labels

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
