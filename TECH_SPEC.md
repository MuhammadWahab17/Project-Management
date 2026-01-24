# Project Management System - Technical Specification

## System Overview

A Next.js-based project management application that enables teams to track projects through a hierarchical structure: Projects → Major Goals → Milestones → Weekly Progress. The system includes automated email reminders for project managers to maintain communication and follow-ups.

## Architecture

### Tech Stack
- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database**: MongoDB with Prisma ORM
- **Email Service**: Nodemailer / Resend / SendGrid
- **Authentication**: NextAuth.js (for future user management)
- **State Management**: React Context / Zustand (for client state)

### Core Data Models

#### Project
```typescript
{
  id: string (UUID)
  name: string
  description: string
  majorGoal: string // The overarching objective
  status: 'active' | 'completed' | 'on-hold'
  createdAt: Date
  updatedAt: Date
}
```

#### Milestone
```typescript
{
  id: string (UUID)
  projectId: string (FK to Project)
  title: string
  description: string
  status: 'pending' | 'in-progress' | 'completed'
  isCurrent: boolean // Only one milestone per project can be current
  targetDate: Date (optional)
  createdAt: Date
  updatedAt: Date
}
```

#### WeeklyProgress
```typescript
{
  id: string (UUID)
  milestoneId: string (FK to Milestone)
  weekStartDate: Date // Sunday of the week
  weekEndDate: Date // Saturday of the week
  completedThisWeek: string[] // Array of completed tasks/achievements
  plannedForNextWeek: string[] // Array of planned tasks
  goalsAchieved: boolean // Whether the weekly goal was achieved
  notes: string (optional)
  createdAt: Date
  updatedAt: Date
}
```

#### EmailReminder
```typescript
{
  id: string (UUID)
  projectId: string (FK to Project)
  subject: string
  message: string // Detailed reminder content
  recipientEmail: string
  reminderDate: Date // When to send the reminder
  status: 'scheduled' | 'sent' | 'cancelled'
  createdAt: Date
}
```

## Feature Requirements

### 1. Project Management
- **Create Project**: User can create a new project with name, description, and major goal
- **View Projects**: Dashboard showing all projects with their current status
- **Edit Project**: Update project details and major goal
- **Project Status**: Visual indicators for active/completed/on-hold projects

### 2. Milestone Management
- **Create Milestone**: Add milestones to a project with title and description
- **Set Current Milestone**: Mark one milestone as the active/current milestone per project
- **Milestone Status**: Track pending → in-progress → completed workflow
- **Milestone View**: List all milestones for a project with current milestone highlighted

### 3. Weekly Progress Tracking
- **Weekly Reports**: Create weekly progress entries tied to the current milestone
- **Report Fields**:
  - Completed tasks/achievements from past week
  - Planned tasks for upcoming week
  - Goals achieved (yes/no flag)
  - Additional notes
- **Sunday-Based System**: System prompts for weekly reports every Sunday
- **Progress History**: View historical weekly progress reports

### 4. Email Automation
- **Create Reminders**: Project managers can schedule email reminders
- **Reminder Fields**:
  - Subject/title
  - Detailed message (what to check/follow up on)
  - Recipient email address
  - Scheduled date/time
- **Email Service**: Background job/API route to send emails at scheduled times
- **Reminder Management**: View, edit, cancel scheduled reminders

## User Flows

### Creating and Managing a Project
1. User creates a project with major goal
2. User adds milestones to the project
3. User sets one milestone as "current"
4. Weekly progress is tracked against the current milestone

### Weekly Progress Tracking (Sunday Workflow)
1. On Sunday, system prompts user to create weekly progress report
2. User enters:
   - What was completed last week
   - What is planned for next week
   - Whether weekly goals were achieved
3. Report is saved and linked to current milestone
4. History is maintained for retrospective analysis

### Email Reminders
1. Project manager navigates to reminder section
2. Creates reminder with subject, message, recipient, and date
3. System queues email to be sent at specified time
4. Background job sends email when scheduled time arrives
5. Reminder status updates to "sent"

## UI/UX Considerations

- **Dashboard**: Overview of all projects with key metrics
- **Project Detail Page**: Milestones, current milestone, weekly progress history
- **Weekly Progress Form**: Clean form for Sunday entries
- **Reminders Section**: Calendar/list view of scheduled reminders
- **Navigation**: Clear navigation between projects, milestones, and progress

## Database Schema Considerations

- Use foreign key relationships for data integrity
- Index on `projectId`, `milestoneId` for query performance
- Unique constraint: Only one `isCurrent: true` milestone per project
- Consider soft deletes for historical data retention

## Email Service Implementation

- Use transactional email service (Resend recommended for Next.js)
- API route handler for sending emails
- Cron job or scheduled task runner for automated sends
- Email template with project context and reminder details

## Future Enhancements (Out of Scope for MVP)

- User authentication and multi-user support
- Team collaboration features
- Analytics and reporting dashboards
- Integration with external project management tools
- Mobile app or responsive mobile-first design
- Real-time notifications
- File attachments for milestones/progress

## Development Approach

1. Set up Next.js project with TypeScript and Tailwind
2. Initialize database schema with Prisma
3. Create API routes for CRUD operations
4. Build UI components and pages incrementally
5. Implement email service and scheduling
6. Add data validation and error handling
7. Test core workflows end-to-end
