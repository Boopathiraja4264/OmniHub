package com.omnihub.core.security;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

/**
 * JPA AttributeConverter that transparently encrypts on write and decrypts on read.
 *
 * Uses a static reference to EncryptionUtil so JPA-instantiated converter instances
 * (which are not Spring-managed) can still access the Spring bean.
 *
 * Apply to a field with: @Convert(converter = EncryptedStringConverter.class)
 */
@Converter
@Component
public class EncryptedStringConverter implements AttributeConverter<String, String> {

    private static EncryptionUtil encryptionUtil;

    @Autowired
    public void setEncryptionUtil(EncryptionUtil util) {
        EncryptedStringConverter.encryptionUtil = util;
    }

    @Override
    public String convertToDatabaseColumn(String attribute) {
        if (attribute == null) return null;
        return encryptionUtil != null ? encryptionUtil.encrypt(attribute) : attribute;
    }

    @Override
    public String convertToEntityAttribute(String dbData) {
        if (dbData == null) return null;
        return encryptionUtil != null ? encryptionUtil.decrypt(dbData) : dbData;
    }
}
