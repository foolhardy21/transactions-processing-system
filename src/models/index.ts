import { ModelCtor, Sequelize } from "sequelize"
import { initTransactionModel, ITransaction } from "./transaction"
import { IAccount, initAccountModel } from "./account"
import { IAccountHolder, initAccountHolderModel } from "./accountHolder"
import { initTransactionEventModel, ITransactionEvent } from "./transactionEvent"

export let Transaction: ModelCtor<ITransaction>
export let Account: ModelCtor<IAccount>
export let AccountHolder: ModelCtor<IAccountHolder>
export let TransactionEvent: ModelCtor<ITransactionEvent>

export function initModels(sequelize: Sequelize) {
    Transaction = initTransactionModel(sequelize)
    Account = initAccountModel(sequelize)
    AccountHolder = initAccountHolderModel(sequelize)
    TransactionEvent = initTransactionEventModel(sequelize)
}
