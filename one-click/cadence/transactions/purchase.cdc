import FungibleToken from 0x9a0766d93b6608b7
import USDC from 0x3fe32988f9457b01

transaction(recipient: Address, amount: UFix64) {

    let sentVault: @FungibleToken.Vault
    let receiverCapability: Capability<&{FungibleToken.Receiver}>

    prepare(signer: auth(BorrowValue) &Account) {
        let vaultRef = signer.storage.borrow<auth(FungibleToken.Withdraw) &USDC.Vault>(from: USDC.VaultStoragePath)
            ?? panic("Could not borrow a reference to the owner's vault")

        self.sentVault <- vaultRef.withdraw(amount: amount)

        self.receiverCapability = getAccount(recipient).capabilities.get<&{FungibleToken.Receiver}>(USDC.ReceiverPublicPath)
            ?? panic("The recipient does not have a USDC vault setup")
    }

    execute {
        let receiver = self.receiverCapability.borrow()
            ?? panic("Could not borrow a reference to the receiver")

        receiver.deposit(from: <-self.sentVault)
    }
}
