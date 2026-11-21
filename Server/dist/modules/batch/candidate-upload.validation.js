import { parse } from "csv-parse/sync";
const allowedColumns = new Set(["fullName", "phone", "email", "candidateCode"]);
const mobilePattern = /^[6-9]\d{9}$/;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export function parseCandidateCsv(file) {
    let records;
    try {
        records = parse(file, {
            bom: true,
            skip_empty_lines: true,
            relax_column_count: false,
            max_record_size: 64 * 1024,
        });
    }
    catch (error) {
        const row = typeof error === "object" && error !== null && "lines" in error
            ? Number(error.lines) || 1
            : 1;
        return {
            success: false,
            errors: [{ row, field: "file", message: "CSV file is malformed" }],
        };
    }
    if (records.length === 0 || records.every((record) => record.every((value) => !value.trim()))) {
        return { success: false, errors: [{ row: 1, field: "file", message: "CSV file is empty" }] };
    }
    const headers = records[0].map((header) => header.trim());
    const errors = [];
    const headerPositions = new Map();
    headers.forEach((header, index) => {
        if (headerPositions.has(header)) {
            errors.push({ row: 1, field: header || "header", message: `Duplicate column "${header}"` });
        }
        else {
            headerPositions.set(header, index);
        }
        if (!allowedColumns.has(header)) {
            errors.push({ row: 1, field: "header", message: `Unexpected column "${header}"` });
        }
    });
    for (const required of ["fullName", "phone"]) {
        if (!headerPositions.has(required)) {
            errors.push({ row: 1, field: required, message: `Required column "${required}" is missing` });
        }
    }
    if (errors.length > 0)
        return { success: false, errors };
    const candidates = [];
    const phoneRows = new Map();
    for (let index = 1; index < records.length; index += 1) {
        const row = index + 1; // CSV row number, including the header.
        const values = records[index];
        const value = (field) => values[headerPositions.get(field)]?.trim() ?? "";
        if (values.length !== headers.length) {
            errors.push({ row, field: "row", message: "Row has a different number of values than the header" });
            continue;
        }
        const fullName = value("fullName");
        const phone = value("phone");
        const email = headerPositions.has("email") ? value("email") : "";
        const candidateCode = headerPositions.has("candidateCode") ? value("candidateCode") : "";
        if (!fullName)
            errors.push({ row, field: "fullName", message: "Full name must not be blank" });
        if (!phone) {
            errors.push({ row, field: "phone", message: "Phone number must not be blank" });
        }
        else if (!mobilePattern.test(phone)) {
            errors.push({
                row,
                field: "phone",
                message: "Phone number must be a valid 10-digit Indian mobile number starting with 6, 7, 8 or 9",
            });
        }
        if (email && !emailPattern.test(email)) {
            errors.push({ row, field: "email", message: "Email address must have a valid format" });
        }
        if (phone) {
            const firstRow = phoneRows.get(phone);
            if (firstRow !== undefined) {
                errors.push({ row, field: "phone", message: `Phone number duplicates row ${firstRow} in this CSV` });
            }
            else {
                phoneRows.set(phone, row);
            }
        }
        candidates.push({ fullName, phone, email: email || null, candidateCode: candidateCode || null });
    }
    if (candidates.length === 0 && errors.length === 0) {
        errors.push({ row: 1, field: "file", message: "CSV must contain at least one candidate row" });
    }
    return errors.length > 0 ? { success: false, errors } : { success: true, candidates };
}
