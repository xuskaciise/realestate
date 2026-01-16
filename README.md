# SIU Admin Dashboard

Admin panel for Somali International University built with Next.js, Tailwind CSS, and shadcn/ui.

## Technologies Used

- **Next.js 14** (App Router)
- **Tailwind CSS** - Styling
- **shadcn/ui** - UI components
- **Prisma** - Database ORM
- **SQLite** - Database
- **Zod** - Form validation
- **Day.js** - Date handling
- **UUID** - File naming
- **Next.js File Upload** - File handling

## Features

- 🎨 Modern admin dashboard interface
- 📊 Dashboard with statistics and quick actions
- 🏠 Properties management (Houses & Rooms) with form validation
- 🗄️ Database models with Prisma (House and Room with relations)
- 👥 User management
- 📄 Document management
- 📤 File upload with UUID-based naming
- ⚙️ Settings page

## Getting Started

1. Install dependencies:

```bash
npm install
```

2. Set up the database:

```bash
# Generate Prisma Client
npm run db:generate

# Push schema to database (creates database file)
npm run db:push
```

3. Run the development server:

```bash
npm run dev
```

4. Open [http://localhost:3000/admin](http://localhost:3000/admin) in your browser.

## Database Models

### House
- `id` (UUID) - Primary key
- `name` (String) - House name
- `address` (String) - House address
- `description` (String, optional) - House description
- `createdAt` (DateTime) - Creation timestamp
- `updatedAt` (DateTime) - Last update timestamp
- `rooms` (Room[]) - Related rooms

### Room
- `id` (UUID) - Primary key
- `name` (String) - Room name
- `monthlyRent` (Float) - Monthly rent amount
- `houseId` (String) - Foreign key to House
- `house` (House) - Related house
- `createdAt` (DateTime) - Creation timestamp
- `updatedAt` (DateTime) - Last update timestamp

## Project Structure

```
├── app/
│   ├── admin/          # Admin pages
│   ├── api/            # API routes (houses, rooms, upload)
│   └── layout.tsx      # Root layout
├── components/
│   ├── ui/             # shadcn/ui components
│   ├── sidebar.tsx     # Sidebar navigation
│   ├── header.tsx      # Header component
│   └── logo.tsx        # SIU Logo component
├── lib/
│   ├── utils.ts        # Utility functions
│   └── prisma.ts       # Prisma client
└── prisma/
    └── schema.prisma   # Database schema
```

## Branding

The dashboard features the Somali International University logo with the motto: "Knowledge, Skills & Morality"
