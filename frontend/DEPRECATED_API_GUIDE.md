# คู่มือการใช้งาน Deprecated API

## การทำงาน

เมื่อ API endpoint ใดถูกทำเครื่องหมายว่า `deprecated: true` ใน OpenAPI spec ระบบจะแสดงผลดังนี้:

### การแสดงผลทั้งหน้าหลักและ Sidebar
- **ขีดทับ (strikethrough)**: ชื่อ path และ summary จะมีเส้นขีดทับ
- **สีตามธีม**: ใช้สีตามธีมปกติ (ขาวใน dark mode, เทาใน light mode)
- **ความโปร่งใส**: มี opacity 60% เพื่อให้ดูเบาลง

### ตัวอย่างการใช้งาน

#### ใน OpenAPI Spec (JSON/YAML)
```json
{
  "paths": {
    "/users": {
      "get": {
        "summary": "Get Users",
        "description": "ดึงรายการ users ทั้งหมด",
        "deprecated": true,
        "responses": {
          "200": {
            "description": "Success"
          }
        }
      }
    }
  }
}
```

#### ผลลัพธ์
API endpoint `/users` จะแสดงด้วย:
- **ทุกที่**: ~~`/users`~~ (ขีดทับ + สีตามธีม + opacity 60%)

## การทดสอบ

ในโปรเจคนี้มีตัวอย่าง deprecated endpoint อยู่แล้ว:
- `GET /users` - ถูกทำเครื่องหมายว่า deprecated

เปิดแอปพลิเคชันและดูที่ endpoint นี้เพื่อดูการแสดงผลทั้งในหน้าหลักและ sidebar

## การปรับแต่ง

หากต้องการเปลี่ยนสไตล์การแสดงผล สามารถแก้ไขได้ที่:

### หน้าหลัก (Main Content)
- **ไฟล์**: `components/EndpointCard.tsx`
- **บรรทัด**: ประมาณ 450-460
- **คลาส CSS**: `line-through opacity-60`

### Sidebar
- **ไฟล์**: `App.tsx`
- **บรรทัด**: ประมาณ 1170
- **คลาส CSS**: `line-through opacity-60`
