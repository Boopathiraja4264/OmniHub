package com.omnihub.finance.controller;

import com.omnihub.finance.service.ImportExportService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import java.util.Map;

@RestController
@RequestMapping("/api/finance")
public class ImportExportController {

    @Autowired private ImportExportService service;

    @GetMapping("/export/summary")
    public ResponseEntity<byte[]> exportSummary(@AuthenticationPrincipal UserDetails u,
                                                 @RequestParam int year) throws Exception {
        byte[] data = service.exportSummaryReport(u.getUsername(), year);
        HttpHeaders h = new HttpHeaders();
        h.setContentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"));
        h.setContentDisposition(ContentDisposition.attachment().filename("expense_summary_" + year + ".xlsx").build());
        return new ResponseEntity<>(data, h, HttpStatus.OK);
    }

    @GetMapping("/export/all")
    public ResponseEntity<byte[]> exportAll(@AuthenticationPrincipal UserDetails u) throws Exception {
        byte[] data = service.exportAll(u.getUsername());
        HttpHeaders h = new HttpHeaders();
        h.setContentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"));
        h.setContentDisposition(ContentDisposition.attachment().filename("all_transactions.xlsx").build());
        return new ResponseEntity<>(data, h, HttpStatus.OK);
    }

    @GetMapping("/export")
    public ResponseEntity<byte[]> export(@AuthenticationPrincipal UserDetails u,
                                          @RequestParam int month, @RequestParam int year) throws Exception {
        byte[] data = service.exportTransactions(u.getUsername(), month, year);
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"));
        headers.setContentDisposition(ContentDisposition.attachment().filename("transactions.xlsx").build());
        return new ResponseEntity<>(data, headers, HttpStatus.OK);
    }

    @GetMapping("/template")
    public ResponseEntity<byte[]> template() throws Exception {
        byte[] data = service.downloadTemplate();
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"));
        headers.setContentDisposition(ContentDisposition.attachment().filename("import_template.xlsx").build());
        return new ResponseEntity<>(data, headers, HttpStatus.OK);
    }

    @PostMapping("/import")
    public ResponseEntity<Map<String, Object>> importFile(@AuthenticationPrincipal UserDetails u,
                                                           @RequestParam("file") MultipartFile file) throws Exception {
        int count = service.importTransactions(u.getUsername(), file);
        return ResponseEntity.ok(Map.of("imported", count));
    }
}
