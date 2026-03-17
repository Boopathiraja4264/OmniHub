package com.omnihub.core.filter;

import jakarta.servlet.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.io.IOException;

/**
 * Logs every API request: method, path, status code, and response time.
 * Example output:
 *   GET  /api/transactions          200  43ms
 *   POST /api/fitness/weight        201  12ms
 *   GET  /api/transactions/recent   500  8ms  ← easy to spot errors
 */
@Component
@Order(1)
public class RequestLoggingFilter implements Filter {

    private static final Logger log = LoggerFactory.getLogger("http");

    @Override
    public void doFilter(ServletRequest req, ServletResponse res, FilterChain chain)
            throws IOException, ServletException {

        HttpServletRequest  request  = (HttpServletRequest)  req;
        HttpServletResponse response = (HttpServletResponse) res;

        long start = System.currentTimeMillis();
        try {
            chain.doFilter(req, res);
        } finally {
            long ms     = System.currentTimeMillis() - start;
            int  status = response.getStatus();
            String line = String.format("%-6s %-45s %d  %dms",
                    request.getMethod(),
                    request.getRequestURI(),
                    status,
                    ms);

            if (status >= 500)      log.error(line);
            else if (status >= 400) log.warn(line);
            else                    log.info(line);
        }
    }
}
