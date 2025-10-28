import FungibleToken from 0x9a0766d93b6608b7
import USDC from 0x3fe32988f9457b01

transaction(recipient: Address, amount: UFix64) {
    let tokenReceiver: &{FungibleToken.Receiver}
    let adminVault: auth(FungibleToken.Withdraw) &USDC.Vault

    prepare(signer: auth(BorrowValue) &Account) {
        // Get the recipient's receiver capability
        self.tokenReceiver = getAccount(recipient)
            .capabilities.borrow<&{FungibleToken.Receiver}>(/public/usdcReceiver)
            ?? panic("Could not borrow receiver capability")
        
        // Borrow the admin's USDC vault to withdraw from
        self.adminVault = signer.storage.borrow<auth(FungibleToken.Withdraw) &USDC.Vault>(from: /storage/usdcVault)
            ?? panic("Could not borrow admin USDC vault")
    }

    execute {
        // Withdraw from admin vault and deposit to recipient
        let tokens <- self.adminVault.withdraw(amount: amount)
        self.tokenReceiver.deposit(from: <-tokens)
    }
}