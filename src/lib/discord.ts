interface OrderWebhookItem {
  name: string;
  category: string;
  price: number;
  quantity: number;
}

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
        title: "สินค้าอัปเดตสต๊อก",
        description: `สต๊อกเพิ่มขึ้น จาก ${oldStock} -> ${newStock}\n\nชื่อสินค้า\n${productName}\n\nหมวดหมู่\n${category}`,
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
      console.error(response.status, errorText);
    }
  } catch (error) {
    console.error(error);
  }
};

export const sendOrderWebhook = async (
  username: string,
  items: OrderWebhookItem[],
  totalPrice: number,
  webhookUrl: string
) => {
  const itemFields = items.map(item => ({
    name: item.name,
    value: `หมวดหมู่: ${item.category}\nราคา: ${item.price}\nจำนวน: ${item.quantity}`,
    inline: false
  }));

  const payload = {
    embeds: [
      {
        title: "รายการสั่งซื้อใหม่",
        color: 3066993,
        fields: [
          { name: "ผู้ซื้อ", value: username, inline: true },
          { name: "ยอดรวม", value: String(totalPrice), inline: true },
          { name: "เวลา", value: new Date().toLocaleString("th-TH"), inline: true },
          ...itemFields
        ]
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
