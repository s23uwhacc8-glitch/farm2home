# Farm2Home - Verification Checklist

## Quick Verification Guide
Use this checklist to verify all bugs are fixed after deploying the updated code.

---

## 🖥️ Server Verification

### 1. Start Server
```bash
cd server
npm run dev
```

**Expected Output:**
```
✓ Server running on port 5000
✓ MongoDB connected successfully
```

**❌ Should NOT see:**
- ⚠️ Mongoose duplicate index warnings
- ⚠️ npm vulnerability warnings
- ⚠️ Any error messages

**Status:** [ ] PASS / [ ] FAIL

---

### 2. Check npm Audit
```bash
cd server
npm audit
```

**Expected Output:**
```
found 0 vulnerabilities
```

**Status:** [ ] PASS / [ ] FAIL

---

## 👥 User Management Verification

### 3. View Users Tab
1. Login as admin
2. Go to Admin Dashboard
3. Click "👥 Users" tab

**Check:**
- [ ] Users list loads correctly
- [ ] Search works (try searching by name/email)
- [ ] Role filter works (try filtering by farmer/customer/delivery)
- [ ] All user data displays correctly

**Status:** [ ] PASS / [ ] FAIL

---

### 4. Toggle User Verification
1. In Users tab, find any user
2. Click on their status badge (Verified/Unverified)
3. Wait for confirmation toast

**Check:**
- [ ] Status changes immediately
- [ ] Toast notification appears ("User verified successfully")
- [ ] Status persists after page refresh

**Status:** [ ] PASS / [ ] FAIL

---

### 5. Change User Role
1. In Users tab, click the edit icon (✏️) for a user
2. Select a different role from dropdown
3. Confirm the change

**Check:**
- [ ] Dropdown appears with all roles
- [ ] Role changes immediately
- [ ] Toast notification appears
- [ ] Cannot change last admin's role (try this!)
- [ ] Badge updates to show new role

**Status:** [ ] PASS / [ ] FAIL

---

### 6. Delete User
1. In Users tab, click delete icon (🗑️) for a non-admin user
2. Confirm deletion in modal

**Check:**
- [ ] Confirmation modal appears
- [ ] User is deleted after confirmation
- [ ] Toast notification appears
- [ ] User removed from list
- [ ] Cannot delete admin users (button should not appear for admins)

**Status:** [ ] PASS / [ ] FAIL

---

## 📊 Admin Dashboard Verification

### 7. Test All Clickable Cards
Click each card and verify it navigates to the correct tab:

**Top Row (4 cards):**
- [ ] "👥 Total Users" → Users tab
- [ ] "📦 Total Orders" → Orders tab (NEW!)
- [ ] "💳 Pending Payments" → Payments tab
- [ ] "⏳ Pending Approvals" → Approvals tab

**Bottom Row (3 cards):**
- [ ] "💰 Platform Revenue" → Payments tab (NEW!)
- [ ] "🌾 Active Farmers" → Users tab (NEW!)
- [ ] "🛵 Delivery Agents" → Delivery tab (NEW!)

**Status:** [ ] PASS (all 7 work) / [ ] FAIL

---

## 💳 COD Payment Verification

### 8. Create COD Order
1. Logout from admin
2. Go to products page
3. Add items to cart
4. Proceed to checkout
5. Select "Cash on Delivery" payment method
6. Complete order

**Check:**
- [ ] Order is created successfully
- [ ] Order confirmation page shows
- [ ] No payment proof upload required
- [ ] Order email sent (check inbox)

**Status:** [ ] PASS / [ ] FAIL

---

### 9. Verify COD Order Status
1. Login as admin
2. Go to Orders tab
3. Find the COD order you just created

**Check:**
- [ ] Order status is "payment-approved" (NOT "pending")
- [ ] Payment method shows "COD"
- [ ] Payment status shows "completed"
- [ ] Order can proceed to farmer without admin approval
- [ ] No "Approve Payment" button needed

**Status:** [ ] PASS / [ ] FAIL

---

### 10. Create Online Payment Order
1. Logout from admin
2. Create another order
3. Select "Online Payment" method
4. Submit payment proof

**Check:**
- [ ] Order is created with status "pending"
- [ ] Payment proof upload page appears
- [ ] After submission, order status is "payment-pending"
- [ ] Admin must approve before farmer can see it

**Status:** [ ] PASS / [ ] FAIL

---

## ✅ Approval Workflow Verification

### 11. User Approval
1. Create a new farmer account (or use existing pending one)
2. Login as admin
3. Go to "⏳ Approvals" tab

**Check:**
- [ ] Pending farmer/delivery users appear
- [ ] All user details visible
- [ ] "✓ Approve" button works
- [ ] "✗ Reject" button requires reason
- [ ] User removed from pending list after action
- [ ] Toast notifications appear

**Status:** [ ] PASS / [ ] FAIL

---

### 12. Payment Approval
1. As admin, go to "💳 Payments" tab
2. Find pending online payment orders

**Check:**
- [ ] Pending payments list loads
- [ ] Payment proof displays (if uploaded)
- [ ] Transaction ID shows
- [ ] "✓ Approve" works correctly
- [ ] "✗ Reject" requires reason
- [ ] Order status updates after approval

**Status:** [ ] PASS / [ ] FAIL

---

## 🔍 Error Handling Verification

### 13. Test Error Messages
Try these scenarios:

**User Management:**
- [ ] Try to delete the last admin → Should show error toast
- [ ] Try to change last admin's role → Should show error
- [ ] Try to delete non-existent user → Should handle gracefully

**Orders:**
- [ ] Try to approve already-approved payment → Should show error
- [ ] Try to reject approved payment → Should show error

**Status:** [ ] PASS / [ ] FAIL

---

## 🎨 UI/UX Verification

### 14. Visual Feedback
Check that these work correctly:

**Loading States:**
- [ ] Buttons show loading spinner during async operations
- [ ] Lists show loading spinner while fetching data
- [ ] No double-clicking possible during operations

**Toast Notifications:**
- [ ] Success toasts appear in green
- [ ] Error toasts appear in red
- [ ] Toasts auto-dismiss after ~3 seconds
- [ ] Toast messages are clear and helpful

**Hover Effects:**
- [ ] Stat cards scale slightly on hover
- [ ] Buttons change color on hover
- [ ] Table rows highlight on hover

**Status:** [ ] PASS / [ ] FAIL

---

## 📱 Responsive Design Verification

### 15. Mobile/Tablet View
Test on different screen sizes (or browser dev tools):

**Desktop (1920x1080):**
- [ ] All cards display in proper grid
- [ ] Tables are readable
- [ ] No horizontal scroll

**Tablet (768x1024):**
- [ ] Cards stack appropriately
- [ ] Navigation remains accessible
- [ ] Tables scroll horizontally if needed

**Mobile (375x667):**
- [ ] Single column layout
- [ ] All buttons are tappable
- [ ] Text is readable

**Status:** [ ] PASS / [ ] FAIL

---

## 🔐 Security Verification

### 16. Role-Based Access
Test that permissions work:

**As Customer:**
- [ ] Cannot access /admin routes
- [ ] Can only see own orders
- [ ] Cannot approve/reject anything

**As Farmer:**
- [ ] Cannot access admin dashboard
- [ ] Can only see assigned orders
- [ ] Cannot manage users

**As Admin:**
- [ ] Can access all admin features
- [ ] Can manage users
- [ ] Can approve orders/payments

**Status:** [ ] PASS / [ ] FAIL

---

## 📊 Results Summary

### Scorecard
Fill in after testing:

- Server Verification: ___/2 tests passed
- User Management: ___/4 tests passed  
- Dashboard: ___/1 test passed
- COD Payments: ___/3 tests passed
- Approvals: ___/2 tests passed
- Error Handling: ___/1 test passed
- UI/UX: ___/1 test passed
- Responsive: ___/1 test passed
- Security: ___/1 test passed

**Total: ___/16 tests passed**

### Overall Status
- [ ] ✅ ALL TESTS PASSED - Ready for production
- [ ] ⚠️ SOME TESTS FAILED - Review failures and fix
- [ ] ❌ CRITICAL FAILURES - Do not deploy

---

## 🐛 If Tests Fail

### Common Issues & Solutions

**Mongoose Warnings Still Appear:**
```bash
cd server
rm -rf node_modules
npm cache clean --force
npm install
```

**npm Vulnerabilities:**
```bash
cd server
npm audit fix --force
# OR manually update package.json overrides
```

**User Management Not Working:**
- Check backend routes are properly defined
- Verify adminController methods exist
- Check network tab in browser dev tools for errors
- Ensure auth token is being sent

**COD Orders Not Auto-Approved:**
- Check orderController.js has latest code
- Verify Order model has correct logic
- Check payment.approvalStatus field
- Restart server after code changes

**Cards Not Clickable:**
- Verify onClick handlers are added
- Check setTab function is passed correctly
- Look for console errors in browser

---

## 📝 Notes Section
Use this space to document any issues found during testing:

```
Date: ___________
Tester: ___________

Issues Found:
1. 
2. 
3. 

Additional Comments:


```

---

**Testing Completed:** [ ] YES / [ ] NO
**Date:** ___________
**Tested By:** ___________
**Environment:** [ ] Development / [ ] Staging / [ ] Production
