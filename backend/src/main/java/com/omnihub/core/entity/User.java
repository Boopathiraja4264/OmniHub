package com.omnihub.core.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "users")
public class User {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false) private String email;
    @Column(nullable = false) private String password;
    @Column(nullable = false) private String fullName;
    @Column(nullable = false, updatable = false) private LocalDateTime createdAt;

    public User() {}

    public static UserBuilder builder() { return new UserBuilder(); }

    public static class UserBuilder {
        private String email, password, fullName;
        public UserBuilder email(String v) { this.email = v; return this; }
        public UserBuilder password(String v) { this.password = v; return this; }
        public UserBuilder fullName(String v) { this.fullName = v; return this; }
        public User build() {
            User u = new User();
            u.email = email; u.password = password; u.fullName = fullName;
            return u;
        }
    }

    @PrePersist protected void onCreate() { createdAt = LocalDateTime.now(); }

    public Long getId() { return id; }
    public String getEmail() { return email; }
    public void setEmail(String v) { email = v; }
    public String getPassword() { return password; }
    public void setPassword(String v) { password = v; }
    public String getFullName() { return fullName; }
    public void setFullName(String v) { fullName = v; }
    public LocalDateTime getCreatedAt() { return createdAt; }
}
