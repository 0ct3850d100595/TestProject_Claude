-- CreateEnum
CREATE TYPE "Role" AS ENUM ('sales', 'manager', 'admin');

-- CreateTable
CREATE TABLE "employees" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'sales',
    "manager_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "employees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customers" (
    "id" SERIAL NOT NULL,
    "company_name" VARCHAR(100) NOT NULL,
    "contact_name" VARCHAR(50) NOT NULL,
    "phone" VARCHAR(20),
    "email" VARCHAR(255),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_reports" (
    "id" SERIAL NOT NULL,
    "employee_id" INTEGER NOT NULL,
    "report_date" DATE NOT NULL,
    "problem" TEXT,
    "plan" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "daily_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "visit_records" (
    "id" SERIAL NOT NULL,
    "daily_report_id" INTEGER NOT NULL,
    "customer_id" INTEGER NOT NULL,
    "visit_content" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "visit_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "manager_comments" (
    "id" SERIAL NOT NULL,
    "daily_report_id" INTEGER NOT NULL,
    "manager_id" INTEGER NOT NULL,
    "comment" TEXT NOT NULL,
    "commented_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "manager_comments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "employees_email_key" ON "employees"("email");

-- CreateIndex
CREATE INDEX "idx_employees_manager" ON "employees"("manager_id");

-- CreateIndex
CREATE INDEX "idx_reports_date" ON "daily_reports"("report_date");

-- CreateIndex
CREATE UNIQUE INDEX "daily_reports_employee_id_report_date_key" ON "daily_reports"("employee_id", "report_date");

-- CreateIndex
CREATE INDEX "idx_visits_report" ON "visit_records"("daily_report_id");

-- CreateIndex
CREATE INDEX "idx_visits_customer" ON "visit_records"("customer_id");

-- CreateIndex
CREATE UNIQUE INDEX "manager_comments_daily_report_id_key" ON "manager_comments"("daily_report_id");

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_manager_id_fkey" FOREIGN KEY ("manager_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_reports" ADD CONSTRAINT "daily_reports_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visit_records" ADD CONSTRAINT "visit_records_daily_report_id_fkey" FOREIGN KEY ("daily_report_id") REFERENCES "daily_reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visit_records" ADD CONSTRAINT "visit_records_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "manager_comments" ADD CONSTRAINT "manager_comments_daily_report_id_fkey" FOREIGN KEY ("daily_report_id") REFERENCES "daily_reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "manager_comments" ADD CONSTRAINT "manager_comments_manager_id_fkey" FOREIGN KEY ("manager_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
