/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const maintenanceTasks = new Collection({
    id: "maint_tasks001",
    name: "maintenance_tasks",
    type: "base",
    system: false,
    listRule: '@request.auth.id != ""',
    viewRule: '@request.auth.id != ""',
    createRule: '@request.auth.id != ""',
    updateRule: '@request.auth.id != ""',
    deleteRule: '@request.auth.id != ""',
    indexes: [
      "CREATE INDEX `idx_maintenance_tasks_status` ON `maintenance_tasks` (`status`)",
      "CREATE INDEX `idx_maintenance_tasks_active_next_due` ON `maintenance_tasks` (`is_active`, `next_due_at`)",
    ],
    fields: [
      {
        name: "title",
        type: "text",
        required: true,
        min: 1,
        max: 0,
        pattern: "",
        autogeneratePattern: "",
      },
      {
        name: "description",
        type: "text",
        required: false,
        min: 0,
        max: 0,
        pattern: "",
        autogeneratePattern: "",
      },
      {
        name: "category",
        type: "text",
        required: false,
        min: 0,
        max: 0,
        pattern: "",
        autogeneratePattern: "",
      },
      {
        name: "is_active",
        type: "bool",
        required: false,
      },
      {
        name: "task_type",
        type: "select",
        required: true,
        maxSelect: 1,
        values: ["recurring", "one_off", "log_only"],
      },
      {
        name: "recurrence_unit",
        type: "select",
        required: false,
        maxSelect: 1,
        values: ["day", "week", "month", "year"],
      },
      {
        name: "recurrence_value",
        type: "number",
        required: false,
        min: 1,
        max: null,
        onlyInt: true,
      },
      {
        name: "anchor_date",
        type: "date",
        required: false,
        min: "",
        max: "",
      },
      {
        name: "fixed_due_date",
        type: "date",
        required: false,
        min: "",
        max: "",
      },
      {
        name: "last_completed_at",
        type: "date",
        required: false,
        min: "",
        max: "",
      },
      {
        name: "next_due_at",
        type: "date",
        required: false,
        min: "",
        max: "",
      },
      {
        name: "status",
        type: "select",
        required: true,
        maxSelect: 1,
        values: ["unscheduled", "up_to_date", "due_soon", "overdue"],
      },
      {
        name: "due_soon_days",
        type: "number",
        required: false,
        min: 1,
        max: null,
        onlyInt: true,
      },
      {
        name: "notes",
        type: "text",
        required: false,
        min: 0,
        max: 0,
        pattern: "",
        autogeneratePattern: "",
      },
    ],
  })

  const maintenanceLogs = new Collection({
    id: "maint_logs0001",
    name: "maintenance_logs",
    type: "base",
    system: false,
    listRule: '@request.auth.id != ""',
    viewRule: '@request.auth.id != ""',
    createRule: '@request.auth.id != ""',
    updateRule: '@request.auth.id != ""',
    deleteRule: '@request.auth.id != ""',
    indexes: [
      "CREATE INDEX `idx_maintenance_logs_task_date` ON `maintenance_logs` (`task`, `performed_at`)",
    ],
    fields: [
      {
        name: "task",
        type: "relation",
        required: true,
        collectionId: "maint_tasks001",
        minSelect: 0,
        maxSelect: 1,
        cascadeDelete: true,
      },
      {
        name: "performed_at",
        type: "date",
        required: true,
        min: "",
        max: "",
      },
      {
        name: "note",
        type: "text",
        required: false,
        min: 0,
        max: 0,
        pattern: "",
        autogeneratePattern: "",
      },
      {
        name: "performed_by",
        type: "relation",
        required: false,
        collectionId: "_pb_users_auth_",
        minSelect: 0,
        maxSelect: 1,
        cascadeDelete: false,
      },
    ],
  })

  app.save(maintenanceTasks)
  app.save(maintenanceLogs)
}, (app) => {
  const maintenanceLogs = app.findCollectionByNameOrId("maint_logs0001")
  if (maintenanceLogs) {
    app.delete(maintenanceLogs)
  }

  const maintenanceTasks = app.findCollectionByNameOrId("maint_tasks001")
  if (maintenanceTasks) {
    app.delete(maintenanceTasks)
  }
})
