export interface OrderWebhookItem {
  name: string;
  category: string;
  price: number;
  quantity: number;
}

// สำหรับตอนแอดมินเติมของ
export const sendRestockWebhook = async (
  productName: string,
  oldStock: number,
  newStock: number,
  category: string,
  imageUrl: string,
  webhookUrl: string
) => {
  const payload: any = {
    embeds: [
      {
        title: "อัปเดตสต๊อก",
        description: `สต๊อกเพิ่มขึ้น จาก ${oldStock} -> ${newStock}\n\n**ชื่อสินค้า**\n${productName}\n\n**หมวดหมู่ / ประเภท**\n\`${category}\``,
        color: 5763719
      }
    ]
  };

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

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Restock Webhook Error:", response.status, errorText);
    }
  } catch (error) {
    console.error("Fetch Error:", error);
  }
};

// สำหรับตอนลูกค้ากดซื้อของ
export const sendOrderWebhook = async (
  username: string,
  items: OrderWebhookItem[],
  totalPrice: number,
  webhookUrl: string
) => {
  const itemFields = items.map(item => ({
    name: `${item.name || "ไม่ระบุชื่อสินค้า"}`,
    value: `nราคา: ${item.price} Point\nจำนวน: ${item.quantity} ชิ้น`,
    inline: false
  }));

  const payload = {
    embeds: [
      {
        title: "รายการสั่งซื้อใหม่",
        color: 3066993,
        fields: [
          { name: "ผู้ซื้อ", value: username || "ไม่ระบุ", inline: true },
          { name: "ยอดรวม", value: `${totalPrice} Point`, inline: true },
          { name: "เวลา", value: new Date().toLocaleString("th-TH"), inline: true },
          ...itemFields
        ]
      }
    ]
  };

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Order Webhook Error:", response.status, errorText);
    }
  } catch (error) {
    console.error("Fetch Error:", error);
  }
};
