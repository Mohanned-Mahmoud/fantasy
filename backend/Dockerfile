FROM python:3.10-slim

# هنحدد فولدر الشغل
WORKDIR /app

# هننسخ ملف المكتبات ونحملها
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# هننسخ باقي ملفات الباك إند
COPY . .

# هنفتح بورت 8080 عشان Back4App بيحبه
EXPOSE 8080

# أمر تشغيل السيرفر
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]