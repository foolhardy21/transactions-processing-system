import { ModelCtor, Sequelize } from "sequelize"
import { initTransactionModel, ITransaction } from "./transaction"
import { IAccount, initAccountModel } from "./account"
import { IAccountHolder, initAccountHolderModel } from "./accountHolder"

export let Transaction: ModelCtor<ITransaction>
export let Account: ModelCtor<IAccount>
export let AccountHolder: ModelCtor<IAccountHolder>

export function initModels(sequelize: Sequelize) {
    Transaction = initTransactionModel(sequelize)
    Account = initAccountModel(sequelize)
    AccountHolder = initAccountHolderModel(sequelize)
}