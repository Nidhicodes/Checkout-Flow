# Checkout-Flow: The Future of E-commerce 🛍️✨

**Checkout-Flow is a revolutionary one-click checkout experience that transforms the traditional online purchase into a unique, AI-powered event.**

---

## 🚀 The Vision

Our vision is to bridge the gap between the complexity of Web3 and the simplicity of modern e-commerce. We believe the future of online retail is not just about seamless transactions, but also about creating memorable, engaging, and rewarding experiences for customers. By combining a frictionless, walletless checkout with the magic of AI-generated art, we're making Web3 accessible and fun for everyone.

## ✨ Key Features

*   **💳 Frictionless Checkout:** A seamless, one-click payment experience on the Flow blockchain.
*   **🔑 Walletless Onboarding:** Users can log in with their existing social accounts (Google, Twitter, etc.) thanks to Web3Auth. A secure, non-custodial Flow wallet is automatically created for them in the background—no seed phrases, no browser extensions.
*   **🎨 AI-Generated NFT Receipts:** After a successful purchase, Stability AI instantly generates a unique, stunning piece of art based on the product. This art is minted as a one-of-a-kind NFT receipt and sent directly to the user's wallet.
*   **🔒 Secure & Transparent:** All transactions are recorded on the Flow blockchain, providing the security and transparency of decentralized technology without sacrificing user experience.

## ⚙️ How It Works

1.  **Select a Product:** The user browses the e-commerce store and chooses a product to buy.
2.  **Log In with Social:** Instead of a "Connect Wallet" button, the user clicks "Login with Social" and authenticates with an account they already have.
3.  **Pay in One Click:** With their auto-generated wallet, the user completes the purchase with a single click.
4.  **Receive an AI NFT:** A unique, AI-generated NFT receipt is created and sent to their Flow wallet, which they can view on the receipt page.

## 💻 Technology Stack

*   **Frontend:** [Next.js](https://nextjs.org), [React](https://reactjs.org), [Tailwind CSS](https://tailwindcss.com)
*   **Blockchain:** [Flow](https://www.onflow.org)
*   **Smart Contracts:** [Cadence](https://developers.flow.com/cadence)
*   **Authentication:** [Web3Auth](https://web3auth.io)
*   **AI Art Generation:** [Stability AI](https://stability.ai)
*   **Deployed on Testnet:** [https://testnet.flowscan.io/contract/A.3fe32988f9457b01.USDC](https://testnet.flowscan.io/contract/A.3fe32988f9457b01.USDC)

## 🛠️ Getting Started

### Prerequisites

*   [Node.js](https://nodejs.org) (v18 or later)
*   [npm](https://www.npmjs.com)

### Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-repo/checkout-flow.git
    cd checkout-flow
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Set up environment variables:**

    Create a `.env.local` file in the root of the project and add the following:

    ```
    NEXT_PUBLIC_MERCHANT_ADDRESS="YOUR_FLOW_MERCHANT_ADDRESS"
    STABILITY_API_KEY="YOUR_STABILITY_AI_API_KEY"
    ```

4.  **Run the development server:**
    ```bash
    npm run dev
    ```

    Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

---

<p align="center">
  Built with ❤️ for Flow.
</p>
