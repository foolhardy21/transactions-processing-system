'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    /**
     * Add altering commands here.
     *
     * Example:
     * await queryInterface.createTable('users', { id: Sequelize.INTEGER });
     */
    await queryInterface.createTable("accounts", {
      id: {
        type: Sequelize.UUID(),
        primaryKey: true,
        allowNull: false,
        unique: true
      },
      balance: {
        type: Sequelize.DECIMAL(10, 2),
        defaultValue: 0,
      },
      holder_id: {
        type: Sequelize.UUID(),
        allowNull: false,
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
      },
    })
  },

  async down(queryInterface, Sequelize) {
    /**
     * Add reverting commands here.
     *
     * Example:
     * await queryInterface.dropTable('users');
     */
    await queryInterface.dropTable("accounts")
  }
};
