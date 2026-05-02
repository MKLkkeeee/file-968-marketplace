export const sendRestockWebhook = async (
  productName: string,
  oldStock: number,
  newStock: number,
  category: string,
  imageUrl: string,
  webhookUrl: string
) => {
  // สร้างโครงสร้าง Embed แจ้งเตือนแบบยังไม่มีรูป
  const payload: any = {
    embeds: [
      {
        title: "สอัปเดตสต๊อก",
        description: `สต๊อกเพิ่มขึ้น จาก ${oldStock} -> ${newStock}\n\n**ชื่อสินค้า**\n${productName}\n\n**หมวดหมู่ / ประเภท**\n\`${category}\``,
        color: 5763719
      }
    ]
  };

  // เช็คว่าผู้ใช้ได้ใส่ URL รูปมาด้วยไหม ถ้าใส่มาถึงจะเพิ่มรูปเข้าไปในแจ้งเตือน
  if (imageUrl && imageUrl.trim() !== "") {
    payload.embeds[0].thumbnail = {
      url: imageUrl
    };
  }

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload)
    });

    // ดักจับ Error ถ้า Discord ปฏิเสธการรับข้อมูล
    if (!response.ok) {
      const errorText = await response.text();
      console.error("Discord Webhook Error:", response.status, errorText);
    }
  } catch (error) {
    console.error("Fetch Webhook Error:", error);
  }
};
