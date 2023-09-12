
export function buildListTemplate(elements: any) {
  return {
    "attachment": {
      "type": "template",
      payload: {
        elements,
        "template_type":"generic",
        "image_aspect_ratio": "square",
      }
    }
  }
}

export function buildReceiptTemplate(payload: any) {
  return {
    "attachment": {
      "type": "template",
      payload,
    }
  }
}


export function buildTextMessage(text: any) {
  return { text }
}
