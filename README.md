# Imagen CLI: Professional Image Generation

A powerful Node.js CLI tool for generating high-quality images in bulk using Google's **Gemini** and **Imagen** Developer APIs. This tool bypasses the complexity of the Cloud Console, providing a direct path from prompt to pixel.

## 🚀 Quick Start

### 1. Get your API Key
The easiest way to get started is through **Google AI Studio**:
1. Go to [aistudio.google.com](https://aistudio.google.com/).
2. Click on **"Get API key"** in the sidebar.
3. Generate a key for a new or existing project.
4. Create a `.env` file in the project root:
   ```env
   GOOGLE_API_KEY=your_key_here
   ```

### 2. Install & Run
```bash
npm install
npm start  # Launches the interactive wizard
```

---

## 🛠 Features

- **Interactive Wizard**: Step-by-step guidance for beginners.
- **Bulk Generation**: Process thousands of images from a text file.
- **Smart Prompting**: Built-in Gemini-powered random prompt generator.
- **Cost Estimation**: Always know the cost before you commit.
- **Model Variety**:
  - `nano-banana`: Ultra-fast image generation (Gemini Flash).
  - `nano-banana-pro`: High-fidelity prompts (Gemini Pro).
  - `imagen-3/4`: State-of-the-art specialized image models.

---

## 💡 Developer API vs. Vertex AI

| Feature | Developer API (AI Studio) | Vertex AI (GCP) |
| :--- | :--- | :--- |
| **Authentication** | Simple API Key | OAuth 2.0 / Service Accounts |
| **Setup Speed** | Seconds | Minutes/Hours (IAM, Billing, etc.) |
| **Pricing** | Free Tier available; Pay-as-you-go | Enterprise pricing via GCP billing |
| **Target Audience** | Individual Devs, Prototyping | Enterprises, Production Apps |
| **SDK** | `@google/genai` | `@google-cloud/vertexai` |

---

## 💰 Back-of-the-Envelope Cost Analysis

The following estimates are based on current **Pay-as-you-go** pricing per image (1K resolution). 

> [!TIP]
```markdown
**Free Tier**: If you are within the Google AI Studio free tier limits, the cost is **$0.00**. This applies to image generation models as well, though they are subject to specific rate limits that differ from text-only models.
```

| Model | 512px | 1K (1024px) | 2K (2048px) | 4K (4096px) |
| :--- | :--- | :--- | :--- | :--- |
| **Nano Banana (Flash)** | $0.045 | $0.067 | $0.101 | $0.151 |
| **Nano Banana Pro** | $0.080 | $0.134 | $0.134 | $0.240 |
| **Imagen 3** | $0.030* | $0.030 | N/A | N/A |
| **Imagen 4** | $0.040* | $0.040 | N/A | N/A |

*\*Imagen models use a flat rate for standard resolutions.*

### Bulk Generation Estimations (1K Resolution)

| Sample Size | Nano Banana (Flash) | Nano Banana Pro | Imagen 3 | Imagen 4 |
| :--- | :--- | :--- | :--- | :--- |
| **1,200 Images** | ~$80.40 | ~$160.80 | $36.00 | $48.00 |
| **25,000 Images** | ~$1,675.00 | ~$3,350.00 | $750.00 | $1,000.00 |

*Note: Pricing is subject to change. Always verify with the CLI's live estimation before generating.*

---

## 💻 Code Snippet (The "Magic")

> [!IMPORTANT]
> **Security First**: Never hardcode your API key or check your `.env` file into version control. Always include `.env` in your `.gitignore`.

```javascript
require('dotenv').config();
const { GoogleGenAI } = require("@google/genai");

// Best practice: Load from environment variables
const client = new GoogleGenAI({ 
  apiKey: process.env.GOOGLE_API_KEY 
});

const result = await client.models.generateContent({
  model: "models/gemini-3.1-flash-image-preview",
  contents: [{ role: 'user', parts: [{ text: "A futuristic city at night" }] }]
});

// Binary image data is returned in the 'inlineData' part
const imagePart = result.candidates[0].content.parts.find(p => p.inlineData);
const imageBase64 = imagePart.inlineData.data;
```

## 📜 License
Apache License 2.0
