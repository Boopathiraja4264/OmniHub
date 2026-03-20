package com.omnihub.finance.service;

import com.omnihub.core.entity.User;
import com.omnihub.core.repository.UserRepository;
import com.omnihub.finance.entity.Transaction;
import com.omnihub.finance.entity.Transaction.TransactionType;
import com.omnihub.finance.repository.TransactionRepository;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.ss.util.CellRangeAddress;
import org.apache.poi.xddf.usermodel.chart.*;
import org.apache.poi.xssf.usermodel.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;

@Service
public class ImportExportService {

    @Autowired private TransactionRepository txRepo;
    @Autowired private UserRepository userRepo;

    private User getUser(String email) {
        return userRepo.findByEmail(email).orElseThrow(() -> new RuntimeException("User not found"));
    }

    // ─── Transactions Export ─────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public byte[] exportAll(String email) throws Exception {
        User user = getUser(email);
        return buildExcelFile(txRepo.findByUserIdOrderByDateDesc(user.getId()));
    }

    @Transactional(readOnly = true)
    public byte[] exportTransactions(String email, Integer month, Integer year) throws Exception {
        User user = getUser(email);
        LocalDate start = LocalDate.of(year, month, 1);
        LocalDate end = start.withDayOfMonth(start.lengthOfMonth());
        return buildExcelFile(txRepo.findByUserIdAndDateBetweenOrderByDateDesc(user.getId(), start, end));
    }

    private byte[] buildExcelFile(List<Transaction> txs) throws Exception {
        try (XSSFWorkbook wb = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = wb.createSheet("Transactions");
            String[] headers = {"Date", "Description", "Category", "Item", "Type", "Amount", "Payment Source", "Notes"};
            Row header = sheet.createRow(0);
            CellStyle headerStyle = wb.createCellStyle();
            Font font = wb.createFont();
            font.setBold(true);
            headerStyle.setFont(font);
            for (int i = 0; i < headers.length; i++) {
                Cell cell = header.createCell(i);
                cell.setCellValue(headers[i]);
                cell.setCellStyle(headerStyle);
                sheet.setColumnWidth(i, 5000);
            }
            int rowIdx = 1;
            for (Transaction t : txs) {
                Row row = sheet.createRow(rowIdx++);
                row.createCell(0).setCellValue(t.getDate().toString());
                row.createCell(1).setCellValue(t.getDescription());
                row.createCell(2).setCellValue(t.getCategory());
                row.createCell(3).setCellValue(t.getItemName() != null ? t.getItemName() : "");
                row.createCell(4).setCellValue(t.getType().name());
                row.createCell(5).setCellValue(t.getAmount().doubleValue());
                row.createCell(6).setCellValue(t.getPaymentSource() != null ? t.getPaymentSource().name() : "");
                row.createCell(7).setCellValue(t.getNotes() != null ? t.getNotes() : "");
            }
            wb.write(out);
            return out.toByteArray();
        }
    }

    // ─── Summary Pivot Report ────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public byte[] exportSummaryReport(String email, int year) throws Exception {
        User user = getUser(email);
        List<Object[]> raw = txRepo.getExpensesByItemAndMonth(user.getId(), year);

        // Build pivot: category (sorted) → item (sorted) → month → amount
        Map<String, Map<String, Map<Integer, BigDecimal>>> pivot = new TreeMap<>();
        for (Object[] row : raw) {
            String cat  = (String) row[0];
            String item = (row[1] != null && !((String) row[1]).isBlank()) ? (String) row[1] : "";
            int month   = ((Number) row[2]).intValue();
            BigDecimal amt = (BigDecimal) row[3];
            pivot.computeIfAbsent(cat, k -> new TreeMap<>())
                 .computeIfAbsent(item, k -> new TreeMap<>())
                 .merge(month, amt, BigDecimal::add);
        }

        try (XSSFWorkbook wb = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            XSSFSheet sheet = wb.createSheet("Summary " + year);
            sheet.setDisplayGridlines(false);
            sheet.setRowSumsBelow(false); // collapse button appears ABOVE group (on category row)

            // Column widths: col0=Category, col1=Item, col2-13=months, col14=Grand Total
            sheet.setColumnWidth(0, 5800);
            sheet.setColumnWidth(1, 5800);
            for (int m = 0; m < 12; m++) sheet.setColumnWidth(m + 2, 3200);
            sheet.setColumnWidth(14, 4400);

            // ── Styles ──────────────────────────────────────────────────────
            short amtFmt = wb.createDataFormat().getFormat("\"₹\"#,##0.00");

            XSSFCellStyle superHdrStyle = mkStyle(wb, "4472C4", true, "FFFFFF", 11, true, amtFmt, false);
            XSSFCellStyle colHdrStyle   = mkStyle(wb, "4472C4", true, "FFFFFF", 10, true, amtFmt, false);
            XSSFCellStyle catStyle      = mkStyle(wb, "FFF2CC", true,  "000000", 10, false, (short)0, false);
            XSSFCellStyle catAmtStyle   = mkStyle(wb, "FFF2CC", true,  "000000", 10, false, amtFmt, true);
            XSSFCellStyle catTotStyle   = mkStyle(wb, "FFE08A", true,  "000000", 10, false, (short)0, false);
            XSSFCellStyle catTotAmtStyle= mkStyle(wb, "FFE08A", true,  "000000", 10, false, amtFmt, true);
            XSSFCellStyle itemStyle     = mkStyle(wb, "FFFFFF", false, "000000", 10, false, (short)0, false);
            XSSFCellStyle itemAmtStyle  = mkStyle(wb, "FFFFFF", false, "000000", 10, false, amtFmt, true);
            XSSFCellStyle grandStyle    = mkStyle(wb, "404040", true,  "FFFFFF", 11, false, (short)0, false);
            XSSFCellStyle grandAmtStyle = mkStyle(wb, "404040", true,  "FFFFFF", 11, false, amtFmt, true);

            // ── Row 0: Super-header ──────────────────────────────────────────
            Row r0 = sheet.createRow(0);
            r0.setHeightInPoints(20);
            setCell(r0, 0, "SUM of Amount (₹)", superHdrStyle);
            setCell(r0, 1, "", superHdrStyle);
            setCell(r0, 2, "Month", superHdrStyle);
            for (int c = 3; c <= 13; c++) setCell(r0, c, "", superHdrStyle);
            setCell(r0, 14, "", superHdrStyle);
            sheet.addMergedRegion(new CellRangeAddress(0, 0, 2, 13));

            // ── Row 1: Column headers ─────────────────────────────────────────
            Row r1 = sheet.createRow(1);
            r1.setHeightInPoints(16);
            setCell(r1, 0, "CategoryH", colHdrStyle);
            setCell(r1, 1, "Item", colHdrStyle);
            for (int m = 1; m <= 12; m++) setCell(r1, m + 1, String.valueOf(m), colHdrStyle);
            setCell(r1, 14, "Grand Total", colHdrStyle);

            // ── Freeze panes ─────────────────────────────────────────────────
            sheet.createFreezePane(2, 2);

            // ── Data rows ────────────────────────────────────────────────────
            int rowIdx = 2;
            BigDecimal[] grandMonthly = new BigDecimal[12];
            Arrays.fill(grandMonthly, BigDecimal.ZERO);
            BigDecimal grandTotal = BigDecimal.ZERO;

            // For charts
            List<String> chartCatNames    = new ArrayList<>();
            List<Double> chartCatAmounts  = new ArrayList<>();
            double[]     chartMonthTotals = new double[12];

            for (Map.Entry<String, Map<String, Map<Integer, BigDecimal>>> catEntry : pivot.entrySet()) {
                String cat = catEntry.getKey();
                Map<String, Map<Integer, BigDecimal>> items = catEntry.getValue();

                // Pre-compute category monthly totals
                BigDecimal[] catMonthly = new BigDecimal[12];
                Arrays.fill(catMonthly, BigDecimal.ZERO);
                BigDecimal catTotal = BigDecimal.ZERO;
                for (Map<Integer, BigDecimal> monthMap : items.values()) {
                    for (Map.Entry<Integer, BigDecimal> me : monthMap.entrySet()) {
                        int mi = me.getKey() - 1;
                        catMonthly[mi] = catMonthly[mi].add(me.getValue());
                        catTotal = catTotal.add(me.getValue());
                    }
                }

                // Category header row (acts as group summary when collapsed)
                int catHeaderRowIdx = rowIdx++;
                Row catRow = sheet.createRow(catHeaderRowIdx);
                catRow.setHeightInPoints(15);
                setCell(catRow, 0, cat, catStyle);
                setCell(catRow, 1, "", catStyle);
                for (int m = 0; m < 12; m++) {
                    Cell mc = catRow.createCell(m + 2);
                    if (catMonthly[m].compareTo(BigDecimal.ZERO) > 0) mc.setCellValue(catMonthly[m].doubleValue());
                    mc.setCellStyle(catAmtStyle);
                }
                Cell catGtCell = catRow.createCell(14);
                catGtCell.setCellValue(catTotal.doubleValue());
                catGtCell.setCellStyle(catAmtStyle);

                int firstItemRow = rowIdx;

                // Item rows (only if there are named items)
                boolean hasNamedItems = items.keySet().stream().anyMatch(k -> !k.isEmpty());
                if (hasNamedItems || items.size() > 1) {
                    for (Map.Entry<String, Map<Integer, BigDecimal>> itemEntry : items.entrySet()) {
                        String itemName = itemEntry.getKey();
                        Map<Integer, BigDecimal> monthMap = itemEntry.getValue();

                        Row itemRow = sheet.createRow(rowIdx++);
                        itemRow.setHeightInPoints(13);
                        setCell(itemRow, 0, "", itemStyle);
                        setCell(itemRow, 1, itemName.isEmpty() ? "(General)" : itemName, itemStyle);

                        BigDecimal itemTotal = BigDecimal.ZERO;
                        for (int m = 1; m <= 12; m++) {
                            Cell mc = itemRow.createCell(m + 1);
                            BigDecimal amt = monthMap.get(m);
                            if (amt != null && amt.compareTo(BigDecimal.ZERO) > 0) {
                                mc.setCellValue(amt.doubleValue());
                                itemTotal = itemTotal.add(amt);
                            }
                            mc.setCellStyle(itemAmtStyle);
                        }
                        Cell itCell = itemRow.createCell(14);
                        itCell.setCellValue(itemTotal.doubleValue());
                        itCell.setCellStyle(itemAmtStyle);
                    }
                }

                int lastItemRow = rowIdx - 1;

                // Group item rows so category row acts as collapse trigger
                if (firstItemRow <= lastItemRow) {
                    sheet.groupRow(firstItemRow, lastItemRow);
                }

                // Category Total row
                Row catTotRow = sheet.createRow(rowIdx++);
                catTotRow.setHeightInPoints(15);
                setCell(catTotRow, 0, cat + " Total", catTotStyle);
                setCell(catTotRow, 1, "", catTotStyle);
                for (int m = 0; m < 12; m++) {
                    Cell mc = catTotRow.createCell(m + 2);
                    if (catMonthly[m].compareTo(BigDecimal.ZERO) > 0) {
                        mc.setCellValue(catMonthly[m].doubleValue());
                        grandMonthly[m] = grandMonthly[m].add(catMonthly[m]);
                        chartMonthTotals[m] += catMonthly[m].doubleValue();
                    }
                    mc.setCellStyle(catTotAmtStyle);
                }
                Cell ctGtCell = catTotRow.createCell(14);
                ctGtCell.setCellValue(catTotal.doubleValue());
                ctGtCell.setCellStyle(catTotAmtStyle);
                grandTotal = grandTotal.add(catTotal);

                chartCatNames.add(cat);
                chartCatAmounts.add(catTotal.doubleValue());
            }

            // Grand Total row
            Row grandRow = sheet.createRow(rowIdx);
            grandRow.setHeightInPoints(18);
            setCell(grandRow, 0, "Grand Total", grandStyle);
            setCell(grandRow, 1, "", grandStyle);
            for (int m = 0; m < 12; m++) {
                Cell mc = grandRow.createCell(m + 2);
                if (grandMonthly[m].compareTo(BigDecimal.ZERO) > 0)
                    mc.setCellValue(grandMonthly[m].doubleValue());
                mc.setCellStyle(grandAmtStyle);
            }
            Cell grandGtCell = grandRow.createCell(14);
            grandGtCell.setCellValue(grandTotal.doubleValue());
            grandGtCell.setCellStyle(grandAmtStyle);

            // ── Charts sheet ─────────────────────────────────────────────────
            addChartsSheet(wb, chartCatNames, chartCatAmounts, chartMonthTotals, year);

            wb.write(out);
            return out.toByteArray();
        }
    }

    // ─── Chart Sheet ─────────────────────────────────────────────────────────

    private void addChartsSheet(XSSFWorkbook wb, List<String> catNames, List<Double> catAmounts,
                                 double[] monthTotals, int year) {
        XSSFSheet cs = wb.createSheet("Charts " + year);
        cs.setDisplayGridlines(false);
        cs.setColumnWidth(0, 3000);
        for (int i = 1; i <= 15; i++) cs.setColumnWidth(i, 2200);

        // Write chart source data in hidden rows (bottom of sheet)
        int dataRow = 60;
        Row catNameRow = cs.createRow(dataRow);
        Row catAmtRow  = cs.createRow(dataRow + 1);
        for (int i = 0; i < catNames.size(); i++) {
            catNameRow.createCell(i).setCellValue(catNames.get(i));
            catAmtRow.createCell(i).setCellValue(catAmounts.get(i));
        }
        Row mLabelRow = cs.createRow(dataRow + 2);
        Row mAmtRow   = cs.createRow(dataRow + 3);
        for (int m = 0; m < 12; m++) {
            mLabelRow.createCell(m).setCellValue(m + 1);
            mAmtRow.createCell(m).setCellValue(monthTotals[m]);
        }

        XSSFDrawing drawing = cs.createDrawingPatriarch();

        // ── Donut chart (Expenses by Category) ──────────────────────────────
        XSSFClientAnchor donutAnchor = drawing.createAnchor(0, 0, 0, 0, 0, 0, 16, 28);
        XSSFChart donut = drawing.createChart(donutAnchor);
        donut.setTitleText("Expenses by Category");
        donut.setTitleOverlay(false);

        XDDFChartLegend donutLegend = donut.getOrAddLegend();
        donutLegend.setPosition(LegendPosition.RIGHT);

        int n = catNames.size();
        XDDFDataSource<String>          catDS  = XDDFDataSourcesFactory.fromStringCellRange(cs,
                new org.apache.poi.ss.util.CellRangeAddress(dataRow, dataRow, 0, n - 1));
        XDDFNumericalDataSource<Double>  amtDS  = XDDFDataSourcesFactory.fromNumericCellRange(cs,
                new org.apache.poi.ss.util.CellRangeAddress(dataRow + 1, dataRow + 1, 0, n - 1));

        XDDFPieChartData donutData = (XDDFPieChartData) donut.createData(ChartTypes.DOUGHNUT, null, null);
        donutData.setVaryColors(true);
        XDDFPieChartData.Series donutSeries = (XDDFPieChartData.Series) donutData.addSeries(catDS, amtDS);
        donutSeries.setTitle("Expenses", null);
        donut.plot(donutData);

        // Add data labels with percentage via XML
        setDonutLabels(donut);

        // ── Bar chart (Expenses by Month) ────────────────────────────────────
        XSSFClientAnchor barAnchor = drawing.createAnchor(0, 0, 0, 0, 0, 30, 16, 58);
        XSSFChart bar = drawing.createChart(barAnchor);
        bar.setTitleText("Expenses by Month");
        bar.setTitleOverlay(false);

        XDDFCategoryAxis bottomAxis = bar.createCategoryAxis(AxisPosition.BOTTOM);
        XDDFValueAxis    leftAxis   = bar.createValueAxis(AxisPosition.LEFT);
        leftAxis.setCrosses(AxisCrosses.AUTO_ZERO);

        XDDFDataSource<Double>          monthLabelDS = XDDFDataSourcesFactory.fromNumericCellRange(cs,
                new org.apache.poi.ss.util.CellRangeAddress(dataRow + 2, dataRow + 2, 0, 11));
        XDDFNumericalDataSource<Double>  monthAmtDS   = XDDFDataSourcesFactory.fromNumericCellRange(cs,
                new org.apache.poi.ss.util.CellRangeAddress(dataRow + 3, dataRow + 3, 0, 11));

        XDDFBarChartData barData = (XDDFBarChartData) bar.createData(ChartTypes.BAR, bottomAxis, leftAxis);
        barData.setBarDirection(BarDirection.COL);
        XDDFBarChartData.Series barSeries = (XDDFBarChartData.Series) barData.addSeries(monthLabelDS, monthAmtDS);
        barSeries.setTitle("Monthly Expenses", null);
        bar.plot(barData);

        // Style bar chart (color + data labels) via XML
        setBarChartStyle(bar);
    }

    /** Set donut chart to show percentage + category name labels */
    private void setDonutLabels(XSSFChart chart) {
        try {
            org.openxmlformats.schemas.drawingml.x2006.chart.CTDoughnutChart dChart =
                chart.getCTChart().getPlotArea().getDoughnutChartArray(0);
            dChart.getSerArray(0).addNewDLbls()
                  .addNewShowPercent().setVal(true);
            dChart.getSerArray(0).getDLbls().addNewShowCatName().setVal(true);
            dChart.getSerArray(0).getDLbls().addNewShowVal().setVal(false);
            dChart.getSerArray(0).getDLbls().addNewShowSerName().setVal(false);
            dChart.getSerArray(0).getDLbls().addNewShowLeaderLines().setVal(true);
            // Hole size ~50%
            dChart.addNewHoleSize().setVal((short) 50);
        } catch (Exception ignored) {}
    }

    /** Set bar chart series to salmon/coral color and add data labels */
    private void setBarChartStyle(XSSFChart chart) {
        try {
            org.openxmlformats.schemas.drawingml.x2006.chart.CTBarChart bChart =
                chart.getCTChart().getPlotArea().getBarChartArray(0);
            org.openxmlformats.schemas.drawingml.x2006.chart.CTBarSer ser = bChart.getSerArray(0);

            // Solid fill – salmon/coral matching reference image
            org.openxmlformats.schemas.drawingml.x2006.main.CTSolidColorFillProperties solid =
                ser.addNewSpPr().addNewSolidFill();
            solid.addNewSrgbClr().setVal(new byte[]{(byte)0xC0, (byte)0x50, (byte)0x4D});

            // Data labels (value above bar)
            org.openxmlformats.schemas.drawingml.x2006.chart.CTDLbls dLbls = ser.addNewDLbls();
            dLbls.addNewShowVal().setVal(true);
            dLbls.addNewShowCatName().setVal(false);
            dLbls.addNewShowSerName().setVal(false);
            dLbls.addNewShowPercent().setVal(false);
            dLbls.addNewShowLegendKey().setVal(false);
        } catch (Exception ignored) {}
    }

    // ─── Template & Import ───────────────────────────────────────────────────

    public byte[] downloadTemplate() throws Exception {
        try (XSSFWorkbook wb = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = wb.createSheet("Transactions");
            String[] headers = {"Date (YYYY-MM-DD)", "Description", "Category", "Item",
                    "Type (INCOME/EXPENSE)", "Amount", "Payment Source (CASH/BANK/CREDIT_CARD)", "Notes"};
            Row header = sheet.createRow(0);
            CellStyle style = wb.createCellStyle();
            Font font = wb.createFont();
            font.setBold(true);
            style.setFont(font);
            for (int i = 0; i < headers.length; i++) {
                Cell cell = header.createCell(i);
                cell.setCellValue(headers[i]);
                cell.setCellStyle(style);
                sheet.setColumnWidth(i, 7000);
            }
            wb.write(out);
            return out.toByteArray();
        }
    }

    @Transactional
    public int importTransactions(String email, MultipartFile file) throws Exception {
        if (file.getSize() > 5 * 1024 * 1024) {
            throw new IllegalArgumentException("File size exceeds the 5 MB limit");
        }
        try {
            org.apache.tika.Tika tika = new org.apache.tika.Tika();
            String mimeType = tika.detect(file.getInputStream());
            if (!mimeType.equals("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
                    && !mimeType.equals("application/vnd.ms-excel")) {
                throw new IllegalArgumentException("Only Excel (.xlsx) files are accepted");
            }
        } catch (IllegalArgumentException e) {
            throw e;
        } catch (Exception e) {
            throw new IllegalArgumentException("Unable to validate file type");
        }
        User user = getUser(email);
        List<Transaction> toSave = new ArrayList<>();
        try (InputStream is = file.getInputStream(); XSSFWorkbook wb = new XSSFWorkbook(is)) {
            Sheet sheet = wb.getSheetAt(0);
            for (int i = 1; i <= sheet.getLastRowNum(); i++) {
                Row row = sheet.getRow(i);
                if (row == null) continue;
                try {
                    String dateStr    = getCellString(row.getCell(0));
                    String description = getCellString(row.getCell(1));
                    String category   = getCellString(row.getCell(2));
                    String itemName   = getCellString(row.getCell(3));
                    String typeStr    = getCellString(row.getCell(4));
                    double amount     = row.getCell(5) != null ? row.getCell(5).getNumericCellValue() : 0;
                    String notes      = getCellString(row.getCell(7));
                    if (dateStr.isBlank() || description.isBlank() || amount <= 0) continue;
                    Transaction t = new Transaction();
                    t.setDate(LocalDate.parse(dateStr));
                    t.setDescription(description);
                    t.setCategory(category.isBlank() ? "Other" : category);
                    t.setItemName(itemName.isBlank() ? null : itemName);
                    t.setType(typeStr.equalsIgnoreCase("INCOME") ? TransactionType.INCOME : TransactionType.EXPENSE);
                    t.setAmount(BigDecimal.valueOf(amount));
                    t.setNotes(notes.isBlank() ? null : notes);
                    t.setUser(user);
                    toSave.add(t);
                } catch (Exception ignored) { }
            }
        }
        txRepo.saveAll(toSave);
        return toSave.size();
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────

    private XSSFCellStyle mkStyle(XSSFWorkbook wb, String bgHex, boolean bold, String fontHex,
                                   int fontSize, boolean center, short numFmt, boolean rightAlign) {
        XSSFCellStyle s = wb.createCellStyle();
        s.setFillForegroundColor(new XSSFColor(hexBytes(bgHex), null));
        s.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        XSSFFont f = wb.createFont();
        f.setBold(bold);
        f.setFontHeightInPoints((short) fontSize);
        f.setFontName("Calibri");
        if (!"000000".equals(fontHex)) f.setColor(new XSSFColor(hexBytes(fontHex), null));
        s.setFont(f);
        s.setAlignment(center ? HorizontalAlignment.CENTER : rightAlign ? HorizontalAlignment.RIGHT : HorizontalAlignment.LEFT);
        s.setVerticalAlignment(VerticalAlignment.CENTER);
        s.setBorderBottom(BorderStyle.THIN);
        s.setBorderTop(BorderStyle.THIN);
        s.setBorderLeft(BorderStyle.THIN);
        s.setBorderRight(BorderStyle.THIN);
        XSSFColor border = new XSSFColor(hexBytes("D0D0D0"), null);
        s.setBottomBorderColor(border);
        s.setTopBorderColor(border);
        s.setLeftBorderColor(border);
        s.setRightBorderColor(border);
        if (numFmt > 0) s.setDataFormat(numFmt);
        return s;
    }

    private void setCell(Row row, int col, String value, XSSFCellStyle style) {
        Cell c = row.createCell(col);
        c.setCellValue(value);
        c.setCellStyle(style);
    }

    private byte[] hexBytes(String hex) {
        return new byte[]{
            (byte) Integer.parseInt(hex.substring(0, 2), 16),
            (byte) Integer.parseInt(hex.substring(2, 4), 16),
            (byte) Integer.parseInt(hex.substring(4, 6), 16)
        };
    }

    private String getCellString(Cell cell) {
        if (cell == null) return "";
        return switch (cell.getCellType()) {
            case STRING  -> cell.getStringCellValue().trim();
            case NUMERIC -> String.valueOf((long) cell.getNumericCellValue());
            default -> "";
        };
    }
}
