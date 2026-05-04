'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_enum
          WHERE enumlabel = 'failed'
          AND enumtypid = 'enum_transactions_status'::regtype
        ) THEN
          ALTER TYPE enum_transactions_status ADD VALUE 'failed';
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM pg_enum
          WHERE enumlabel = 'completed'
          AND enumtypid = 'enum_transactions_status'::regtype
        ) THEN
          ALTER TYPE enum_transactions_status ADD VALUE 'completed';
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM pg_enum
          WHERE enumlabel = 'flagged'
          AND enumtypid = 'enum_transactions_status'::regtype
        ) THEN
          ALTER TYPE enum_transactions_status ADD VALUE 'flagged';
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM pg_enum
          WHERE enumlabel = 'finalized'
          AND enumtypid = 'enum_transactions_status'::regtype
        ) THEN
          ALTER TYPE enum_transactions_status ADD VALUE 'finalized';
        END IF;
      END $$;
    `)

    await queryInterface.sequelize.query(`
      UPDATE transactions
      SET status = CASE
        WHEN status::text = 'success' THEN 'completed'::enum_transactions_status
        WHEN status::text = 'fail' THEN 'failed'::enum_transactions_status
        ELSE status
      END
      WHERE status::text IN ('success', 'fail');
    `)
  },

  async down() {
    // PostgreSQL enum values cannot be safely removed without rebuilding the type.
  }
};
