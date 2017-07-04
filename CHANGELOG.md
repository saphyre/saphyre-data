# Saphyre Data – Changelog

## Version 1.4.0
* **[FEATURE]** Added option to sort randomly

## Version 1.3.0
* **[FEATURE]** Added option to left join BelongsTo associations

## Version 1.2.1
* **[BUG-FIX]** Fixed a problem causing invalid query when using Models with primary key different from column name. E.g: `id : { field : 'table_id', ... }`

## Version 1.2.0
* **[FEATURE]** Added function to create sorts based on an existing projection

## Version 1.1.3
* **[BUG-FIX]** Fixed a problem causing Aggregation functions to not generate GROUP BY on other fields.

## Version 1.1.2
* **[BUG-FIX]** BOOLEAN fields will always return as Boolean in MySQL

## Version 1.1.1
* **[BUG-FIX]** BIGINT fields will always return as String in SQLite

## Version 1.1.0
* **[FEATURE]** Added support to PostgreSQL
* **[FEATURE]** Added support to schemas
* **[FEATURE]** Added support to custom field_name
* **[BUG-FIX]** Fixed an issue when handling BIGINT fields with large numbers (now returning String).