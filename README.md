# 🛞 Ridex

## 📚 Table of Contents
- About
- Features
- Technology Stack
- Project Phases & Progress
- Getting Started
- Contact

---

## 📖 About

**Ridex** is a modern transportation and logistics platform built with the MERN stack, designed to streamline ride booking, driver coordination, and real-time trip management. Inspired by Nepal’s digital mobility landscape, Ridex bridges mobile-first experiences with a robust and responsive web application.

With modular architecture, socket-powered sync, and role-based workflows, Ridex is built for expansion—from rides to deliveries to fleet management.

---

## ✨ Features

### Core Features

- **Role-Based Access Control**  
  Differentiated dashboards and actions for Admins, Drivers, and Users.

- **User Management System**  
  Admins can onboard users, assign roles, and control access rights.

- **Driver Profiles & Availability**  
  Drivers can update availability, vehicle info, and receive ratings.

- **Ride Booking Flow**  
  Real-time ride requests, driver matching, trip tracking, and completion.

- **Live Tracking & Socket Integration**  
  GeoJSON-powered driver location sync via Socket.IO.

- **Trip History & Receipt View**  
  Drivers and users can access ride summaries and digital receipts.

- **Admin Reporting Dashboard**  
  Visual metrics on rides, activity, peak time usage, and more.

- **API-First Design**  
  Clean REST architecture built for future mobile app integration.

---

## 🧰 Technology Stack

### Frontend

- React.js  
- Tailwind CSS  
- React Router  
- Axios  
- Redux Toolkit *(optional)*  
- Socket.IO Client

### Backend

- Node.js  
- Express.js  
- MongoDB with Mongoose  
- Socket.IO  
- JWT for authentication  
- bcrypt.js for password hashing  
- Multer *(for file uploads, optional)*

### Database

- MongoDB  
- GeoJSON fields for driver location data

---
```
## 🗂️ Project Phases & Progress

### Phase 1: Authentication & Admin Controls *(✅ Completed)*

**Frontend:**
- Login/Register components  
- Admin Dashboard with user role assignment  
- Redux setup for global auth

**Backend:**
- JWT-based Auth APIs  
- Secure password hashing with bcrypt  
- Role-based middleware  
- Admin endpoints for user CRUD and role management

---

### Phase 2: Driver Module & Booking System *(🚧 In Progress)*

**Frontend:**
- Driver Dashboard  
- Availability toggles  
- Booking interface  
- Trip History components

**Backend:**
- Driver schema with GeoJSON location tracking  
- Ride Request endpoints  
- Real-time match logic using Socket.IO  
- APIs for trip lifecycle

---

### Phase 3: User Experience & Booking Interface *(🕓 Planned)*

**Frontend:**
- Ride Request form  
- Map interface showing nearby drivers  
- Booking history dashboard  
- Receipt and rating views

**Backend:**
- Bookings CRUD  
- Location-based driver search  
- Trip receipts & feedback routes

---

### Phase 4: Analytics, Optimization, & Mobile API Support *(🔮 Upcoming)*

**Frontend:**
- Admin visual analytics (charts, graphs)  
- Notification system integration  
- UX polish for mobile experience

**Backend:**
- Advanced reporting endpoints  
- Performance tuning  
- Auth-protected mobile-compatible APIs

---

## ⚙️ Getting Started

### Prerequisites

- Node.js (v18+ recommended)  
- MongoDB (local or Atlas)  
- Postman for API testing  
- Git

---

### Installation

**Clone the repository**

```bash
git clone https://github.com/your-username/ridex
cd ridex
