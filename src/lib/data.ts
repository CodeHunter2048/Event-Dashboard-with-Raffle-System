export type Attendee = {
  id: string;
  name: string;
  email: string;
  organization: string;
  role: string;
  checkedIn: boolean;
  checkInTime: string | null;
  avatar: string;
};

export type Prize = {
  id: string;
  name: string;
  description: string;
  quantity: number;
  remaining: number;
  tier: 'Grand' | 'Major' | 'Minor';
  image: string;
};

export type Winner = {
  attendee: Attendee;
  prize: Prize;
  timestamp: string;
  claimed: boolean;
};

export const attendees: Attendee[] = [
  { id: 'A001', name: 'Dr. Evelyn Reed', email: 'e.reed@univ.edu', organization: 'Tech University', role: 'Speaker', checkedIn: true, checkInTime: '2023-10-26T09:05:14Z', avatar: '1' },
  { id: 'A002', name: 'Ben Carter', email: 'ben.carter@innovate.co', organization: 'Innovate Inc.', role: 'Attendee', checkedIn: true, checkInTime: '2023-10-26T09:15:22Z', avatar: '2' },
  { id: 'A003', name: 'Olivia Chen', email: 'olivia.chen@datatech.com', organization: 'DataTech Global', role: 'Attendee', checkedIn: true, checkInTime: '2023-10-26T09:25:45Z', avatar: '3' },
  { id: 'A004', name: 'Marcus Grant', email: 'm.grant@futureai.dev', organization: 'FutureAI Labs', role: 'Sponsor', checkedIn: true, checkInTime: '2023-10-26T09:30:11Z', avatar: '4' },
  { id: 'A005', name: 'Sophia Loren', email: 'sophia@academia.edu', organization: 'State University', role: 'Professor', checkedIn: false, checkInTime: null, avatar: '5' },
  { id: 'A006', name: 'Liam Wilson', email: 'liam.w@startup.io', organization: 'AI Startup', role: 'Founder', checkedIn: true, checkInTime: '2023-10-26T09:45:00Z', avatar: '6' },
  { id: 'A007', name: 'Ava Garcia', email: 'ava.g@mail.com', organization: 'AI Enthusiasts', role: 'Student', checkedIn: false, checkInTime: null, avatar: '7' },
  { id: 'A008', name: 'Noah Rodriguez', email: 'noah.r@techcorp.com', organization: 'TechCorp', role: 'Engineer', checkedIn: true, checkInTime: '2023-10-26T10:02:30Z', avatar: '8' },
  { id: 'A009', name: 'Isabella Martinez', email: 'isabella.m@gmail.com', organization: 'Independent Researcher', role: 'Researcher', checkedIn: true, checkInTime: '2023-10-26T10:10:10Z', avatar: '9' },
  { id: 'A010', name: 'James Brown', email: 'james.b@company.com', organization: 'Big Company', role: 'Manager', checkedIn: false, checkInTime: null, avatar: '10' },
  { id: 'A011', name: 'Dr. Alan Turing', email: 'alan.t@bletchley.park', organization: 'Bletchley Park', role: 'Historical Figure', checkedIn: true, checkInTime: '2023-10-26T08:00:00Z', avatar: '11' },
  { id: 'A012', name: 'Grace Hopper', email: 'grace.h@navy.mil', organization: 'US Navy', role: 'Historical Figure', checkedIn: true, checkInTime: '2023-10-26T08:05:00Z', avatar: '12' },
];


export const prizes: Prize[] = [
  { id: 'P01', name: 'AI-Powered Drone', description: 'A state-of-the-art quadcopter with AI-powered navigation.', quantity: 1, remaining: 1, tier: 'Grand', image: 'prize1' },
  { id: 'P02', name: 'GPU Cloud Credits', description: '$500 in cloud credits for your next big model training.', quantity: 3, remaining: 3, tier: 'Major', image: 'prize2' },
  { id: 'P03', name: 'Mechanical Keyboard', description: 'A premium mechanical keyboard for the discerning developer.', quantity: 5, remaining: 4, tier: 'Minor', image: 'prize3' },
  { id: 'P04', name: 'AI Conference Ticket', description: 'Free ticket to next year\'s conference.', quantity: 2, remaining: 2, tier: 'Major', image: 'prize4' },
  { id: 'P05', name: 'AI Book Bundle', description: 'A collection of the latest must-read AI books.', quantity: 10, remaining: 10, tier: 'Minor', image: 'prize5' },
];

export const checkInHistory = [
    { attendeeId: 'A001', timestamp: '2024-08-15T09:05:14Z', deviceId: 'SCANNER-01' },
    { attendeeId: 'A002', timestamp: '2024-08-15T09:15:22Z', deviceId: 'SCANNER-02' },
    { attendeeId: 'A003', timestamp: '2024-08-15T09:25:45Z', deviceId: 'SCANNER-01' },
    { attendeeId: 'A004', timestamp: '2024-08-15T09:30:11Z', deviceId: 'SCANNER-03' },
    { attendeeId: 'A006', timestamp: '2024-08-15T09:45:00Z', deviceId: 'SCANNER-02' },
    { attendeeId: 'A008', timestamp: '2024-08-15T10:02:30Z', deviceId: 'SCANNER-01' },
    { attendeeId: 'A009', timestamp: '2024-08-15T10:10:10Z', deviceId: 'SCANNER-03' },
    { attendeeId: 'A001', timestamp: '2024-08-15T10:12:00Z', deviceId: 'SCANNER-01' }, // Suspicious double check-in
    { attendeeId: 'A002', timestamp: '2024-08-15T10:12:05Z', deviceId: 'SCANNER-01' }, // Suspicious double check-in
    { attendeeId: 'A003', timestamp: '2024-08-15T10:12:10Z', deviceId: 'SCANNER-01' }, // Suspicious double check-in
    { attendeeId: 'A011', timestamp: '2024-08-15T08:00:00Z', deviceId: 'SCANNER-04' },
    { attendeeId: 'A012', timestamp: '2024-08-15T08:05:00Z', deviceId: 'SCANNER-04' },
];

export const winners: Winner[] = [
    {
        attendee: attendees[3],
        prize: prizes[2],
        timestamp: '2023-10-26T11:00:00Z',
        claimed: true,
    }
]
