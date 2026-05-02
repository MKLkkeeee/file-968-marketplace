export const sendRestockWebhook = async (
  productName: string,
  oldStock: number,
  newStock: number,
  category: string,
  imageUrl: string,
  webhookUrl: string
) => {
  const payload = {
    embeds: [
      {
        title: "อัปเดตสต๊อก",
        description: `สต๊อกเพิ่มขึ้น จาก ${oldStock} -> ${newStock}\n\n **ชื่อสินค้า**\n${productName}\n\n**หมวดหมู่ / ประเภท**\n\`${category}\``,
        color: 5763719,
        thumbnail: {
          url: imageUrl
        }
      }
    ]
  };

  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload)
    });
  } catch (error) {
    console.error(error);
  }
};
