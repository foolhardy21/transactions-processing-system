'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("transaction_events", {
      id: {
        type: Sequelize.UUID(),
        primaryKey: true,
        allowNull: false,
        unique: true,
      },
      transaction_id: {
        type: Sequelize.UUID(),
        allowNull: false,
      },
      account_id: {
        type: Sequelize.UUID(),
        allowNull: false,
      },
      event_type: {
        type: Sequelize.STRING(),
        allowNull: false,
      },
      correlation_id: {
        type: Sequelize.UUID(),
        allowNull: false,
      },
      causation_id: {
        type: Sequelize.UUID(),
        allowNull: true,
      },
      transaction_type: {
        type: Sequelize.ENUM("debit", "credit"),
        allowNull: true,
      },
      amount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
      },
      status: {
        type: Sequelize.ENUM("pending", "failed", "completed", "flagged", "finalized"),
        allowNull: true,
      },
      balance_before: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
      },
      balance_after: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
      },
      reason: {
        type: Sequelize.TEXT(),
        allowNull: true,
      },
      payload: {
        type: Sequelize.JSONB(),
        allowNull: false,
        defaultValue: {},
      },
      occurred_at: {
        type: Sequelize.DATE(),
        allowNull: false,
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE(),
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE(),
      },
    })

    await queryInterface.addIndex("transaction_events", ["account_id", "occurred_at"])
    await queryInterface.addIndex("transaction_events", ["correlation_id", "occurred_at"])
    await queryInterface.addIndex("transaction_events", ["transaction_id", "occurred_at"])
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("transaction_events")
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_transaction_events_transaction_type";')
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_transaction_events_status";')
  }
};
