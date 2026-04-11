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
    await queryInterface.addConstraint("accounts", {
      fields: ["holder_id"],
      type: "foreign key",
      name: "account_holders_id_fkey",
      references: {
        table: "account_holders",
        field: "id",
      },
    })
    await queryInterface.addConstraint("transactions", {
      fields: ["account_id"],
      type: "foreign key",
      name: "account_id_fkey",
      references: {
        table: "accounts",
        field: "id",
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
    await queryInterface.removeConstraint("accounts", "account_holders_id_fkey")
    await queryInterface.removeConstraint("transactions", "account_id_fkey")
  }
};
