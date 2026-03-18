package com.omnihub.finance.service;

import com.omnihub.core.dto.DTOs.*;
import com.omnihub.core.entity.User;
import com.omnihub.core.repository.UserRepository;
import com.omnihub.finance.entity.ExpenseCategory;
import com.omnihub.finance.entity.ExpenseItem;
import com.omnihub.finance.repository.ExpenseCategoryRepository;
import com.omnihub.finance.repository.ExpenseItemRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class CategoryItemService {

    @Autowired private ExpenseCategoryRepository categoryRepo;
    @Autowired private ExpenseItemRepository itemRepo;
    @Autowired private UserRepository userRepo;

    static final Map<String, List<String>> SEED = new LinkedHashMap<>();

    static {
        SEED.put("Activity",                           Arrays.asList("Boating", "Skating"));
        SEED.put("Bills",                              Arrays.asList("Credit Card", "Credit card annual fee"));
        SEED.put("Cash Withdrawal",                    Arrays.asList("ATM"));
        SEED.put("Charges",                            Arrays.asList("Bank charges"));
        SEED.put("Commute",                            Arrays.asList(
                "Bike Accesories", "Bike Petrol", "Bike Repair", "Bike Service",
                "Bla Bla", "Bus Pass", "Bus Ticket", "Car Accesories", "Car Fasttag",
                "Car Petrol", "Car Service", "Metro", "Petrol", "Rapido,Ola,Uber",
                "Scooty or XL Petrol", "Train Pass", "Train Ticket"));
        SEED.put("Donation",                           Arrays.asList("Marathon"));
        SEED.put("Eating Out(UnHealthy)",              Arrays.asList(
                "BigBasket", "Breakfast", "Coffee", "Dinner", "Icecream", "Juice",
                "Lunch", "Pizza", "Restaurant", "Snacks", "Swiggy", "Tea", "Zepto", "Zomato"));
        SEED.put("EMI",                                Arrays.asList("Eletronics", "Mobile EMI", "Personal Loan"));
        SEED.put("Entertainment",                      Arrays.asList(
                "Activity", "Amazon Prime", "Cinema", "Museum", "Netflix", "Theme park", "Trip"));
        SEED.put("Fitness",                            Arrays.asList("FitnessSubscription", "Gym", "Products"));
        SEED.put("Gadgets",                            Arrays.asList(
                "Headset", "Macbook and Macbook Accessories", "Mobile and Accessories"));
        SEED.put("Gift",                               Arrays.asList("Gift"));
        SEED.put("Gold",                               Arrays.asList("Gold", "GoldBees", "SGB"));
        SEED.put("Grooming",                           Arrays.asList("Grooming", "Grooming Products", "Hair cut", "Trim"));
        SEED.put("Home & Living",                      Arrays.asList(
                "Cleaning Supplies", "Decor", "Electricals & Applicances", "Electricity",
                "Furniture", "Gas", "Maid", "Personal Care", "Rent", "Repairs", "Water"));
        SEED.put("Home Groceries(Healthy & Common)",   Arrays.asList("Grocery"));
        SEED.put("Home Groceries(Healthy & Personal)", Arrays.asList(
                "Chicken", "Eggs", "Fruits", "Protien Powder"));
        SEED.put("Insurance",                          Arrays.asList("Health Insurance", "Term Insurance"));
        SEED.put("Investments",                        Arrays.asList(
                "AngelOne", "Coin", "Groww", "Kite", "Mutual Funds", "Stocks", "Upstox", "Zerodha"));
        SEED.put("Learning",                           Arrays.asList("Subscription"));
        SEED.put("Marriage",                           Arrays.asList("Jathagam"));
        SEED.put("Medical",                            Arrays.asList("Doctor", "Medical", "Medicine"));
        SEED.put("Misc",                               Arrays.asList("Moving service"));
        SEED.put("Mobile & Internet",                  Arrays.asList(
                "Airtel Black", "Airtel Mobile", "Asianet", "BSNL", "Internet",
                "Jio", "Mobile", "SIM Card", "Tata Play", "Vodafone"));
        SEED.put("No Idea",                            Arrays.asList("No Idea"));
        SEED.put("Other",                              Collections.emptyList());
        SEED.put("Shopping",                           Arrays.asList("Amazon", "Dress", "Flipkart", "Personal Utilities"));
        SEED.put("Silver",                             Arrays.asList("Ornaments"));
        SEED.put("Subscription",                       Arrays.asList("Apple Mandate", "Apple Music", "Google Play", "JioHotstar"));
        SEED.put("Tour",                               Arrays.asList("Tour", "Trip"));
        SEED.put("Travel",                             Arrays.asList("Tour", "Trip"));
        SEED.put("Unexpected",                         Arrays.asList("Emergency", "Treat", "Unexpected"));
    }

    private User getUser(String email) {
        return userRepo.findByEmail(email).orElseThrow(() -> new RuntimeException("User not found"));
    }

    /**
     * Idempotent seed — checks each category and item by name before inserting.
     * Safe to call multiple times; will never create duplicates.
     */
    @Transactional
    public void seedIfEmpty(String email) {
        User user = getUser(email);
        if (categoryRepo.countByUserId(user.getId()) > 0) return;
        doSeed(user);
    }

    /**
     * Deletes ALL categories and items for the user and re-seeds from the default list.
     * Use this once to clean up duplicates.
     */
    @Transactional
    public void resetAndReseed(String email) {
        User user = getUser(email);
        itemRepo.deleteAllByUserId(user.getId());
        categoryRepo.deleteAllByUserId(user.getId());
        doSeed(user);
    }

    private void doSeed(User user) {
        SEED.forEach((catName, items) -> {
            // Upsert category — only insert if name doesn't exist for this user
            ExpenseCategory cat = categoryRepo.findByUserIdAndName(user.getId(), catName)
                    .orElseGet(() -> {
                        ExpenseCategory c = new ExpenseCategory();
                        c.setName(catName);
                        c.setUser(user);
                        return categoryRepo.save(c);
                    });
            for (String itemName : items) {
                // Upsert item — only insert if (category, name) doesn't exist for this user
                if (!itemRepo.existsByCategoryIdAndUserIdAndName(cat.getId(), user.getId(), itemName)) {
                    ExpenseItem item = new ExpenseItem();
                    item.setName(itemName);
                    item.setCategory(cat);
                    item.setUser(user);
                    itemRepo.save(item);
                }
            }
        });
    }

    @Transactional
    public List<CategoryResponse> getCategories(String email) {
        User user = getUser(email);
        seedIfEmpty(email);
        return categoryRepo.findByUserIdOrderByNameAsc(user.getId())
                .stream().map(c -> new CategoryResponse(c.getId(), c.getName()))
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<ItemResponse> getItems(String email, Long categoryId) {
        User user = getUser(email);
        return itemRepo.findByCategoryIdAndUserIdOrderByNameAsc(categoryId, user.getId())
                .stream().map(i -> new ItemResponse(i.getId(), i.getName(),
                        i.getCategory().getId(), i.getCategory().getName()))
                .collect(Collectors.toList());
    }

    @Transactional
    public List<ItemResponse> getAllItems(String email) {
        User user = getUser(email);
        seedIfEmpty(email);
        return itemRepo.findAllByUserIdWithCategory(user.getId())
                .stream().map(i -> new ItemResponse(i.getId(), i.getName(),
                        i.getCategory().getId(), i.getCategory().getName()))
                .collect(Collectors.toList());
    }

    @Transactional
    public CategoryResponse addCategory(String email, CategoryRequest req) {
        User user = getUser(email);
        ExpenseCategory cat = new ExpenseCategory();
        cat.setName(req.getName());
        cat.setUser(user);
        cat = categoryRepo.save(cat);
        return new CategoryResponse(cat.getId(), cat.getName());
    }

    @Transactional
    public void deleteCategory(String email, Long id) {
        User user = getUser(email);
        ExpenseCategory cat = categoryRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Category not found"));
        if (!cat.getUser().getId().equals(user.getId()))
            throw new RuntimeException("Unauthorized");
        itemRepo.findByCategoryId(id).forEach(itemRepo::delete);
        categoryRepo.delete(cat);
    }

    @Transactional
    public ItemResponse addItem(String email, ItemRequest req) {
        User user = getUser(email);
        ExpenseCategory cat = categoryRepo.findById(req.getCategoryId())
                .orElseThrow(() -> new RuntimeException("Category not found"));
        if (!cat.getUser().getId().equals(user.getId()))
            throw new RuntimeException("Unauthorized");
        ExpenseItem item = new ExpenseItem();
        item.setName(req.getName());
        item.setCategory(cat);
        item.setUser(user);
        item = itemRepo.save(item);
        return new ItemResponse(item.getId(), item.getName(), cat.getId(), cat.getName());
    }

    @Transactional
    public void deleteItem(String email, Long id) {
        User user = getUser(email);
        ExpenseItem item = itemRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Item not found"));
        if (!item.getUser().getId().equals(user.getId()))
            throw new RuntimeException("Unauthorized");
        itemRepo.delete(item);
    }
}
