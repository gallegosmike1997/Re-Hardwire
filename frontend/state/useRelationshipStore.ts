/**
 * Relationship Boundaries and Care Plan Network Tracker State
 */
import { create } from 'zustand';
import { getStorage, setStorage } from '@/lib/storage';

export interface BoundaryRule {
  id: string;
  title: string;
  category: 'communication' | 'time' | 'energy' | 'emotional';
  rule: string;
  active: boolean;
  createdAt: string;
}

export interface NetworkContact {
  id: string;
  name: string;
  role: 'ally' | 'accountability' | 'professional' | 'trusted';
  contactInfo?: string;
  boundaryNotes?: string;
  activeInCarePlan: boolean;
  createdAt: string;
}

interface RelationshipState {
  boundaries: BoundaryRule[];
  contacts: NetworkContact[];
  isHydrated: boolean;

  hydrate: () => void;
  addBoundary: (boundary: Omit<BoundaryRule, 'id' | 'createdAt'>) => void;
  updateBoundary: (id: string, updates: Partial<BoundaryRule>) => void;
  deleteBoundary: (id: string) => void;

  addContact: (contact: Omit<NetworkContact, 'id' | 'createdAt'>) => void;
  updateContact: (id: string, updates: Partial<NetworkContact>) => void;
  deleteContact: (id: string) => void;
}

const BOUNDARIES_KEY = 'rehardwire_boundaries_v1';
const CONTACTS_KEY = 'rehardwire_care_network_v1';

const DEFAULT_BOUNDARIES: BoundaryRule[] = [
  {
    id: 'b1',
    title: 'Space After High-Stress Hours',
    category: 'time',
    rule: 'I will not engage in heavy problem-solving or administrative discussions after 8 PM.',
    active: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'b2',
    title: 'Emotional Capacity Check',
    category: 'emotional',
    rule: 'Before taking on others crises, I will check my current battery level and set a 15-minute timer if needed.',
    active: true,
    createdAt: new Date().toISOString(),
  },
];

const DEFAULT_CONTACTS: NetworkContact[] = [
  {
    id: 'c1',
    name: 'Primary Support Ally',
    role: 'ally',
    contactInfo: 'Trusted family member / partner',
    boundaryNotes: 'Can be reached for grounding check-ins anytime.',
    activeInCarePlan: true,
    createdAt: new Date().toISOString(),
  },
];

export const useRelationshipStore = create<RelationshipState>((set, get) => ({
  boundaries: [],
  contacts: [],
  isHydrated: false,

  hydrate: () => {
    if (get().isHydrated) return;
    const boundaries = getStorage<BoundaryRule[]>(BOUNDARIES_KEY) ?? DEFAULT_BOUNDARIES;
    const contacts = getStorage<NetworkContact[]>(CONTACTS_KEY) ?? DEFAULT_CONTACTS;
    if (!getStorage<BoundaryRule[]>(BOUNDARIES_KEY)) setStorage(BOUNDARIES_KEY, DEFAULT_BOUNDARIES);
    if (!getStorage<NetworkContact[]>(CONTACTS_KEY)) setStorage(CONTACTS_KEY, DEFAULT_CONTACTS);
    set({ boundaries, contacts, isHydrated: true });
  },

  addBoundary: (boundaryData) => {
    const newBoundary: BoundaryRule = {
      id: `bound_${Date.now().toString(36)}`,
      ...boundaryData,
      createdAt: new Date().toISOString(),
    };
    const boundaries = [newBoundary, ...get().boundaries];
    setStorage(BOUNDARIES_KEY, boundaries);
    set({ boundaries });
  },

  updateBoundary: (id, updates) => {
    const boundaries = get().boundaries.map((b) => (b.id === id ? { ...b, ...updates } : b));
    setStorage(BOUNDARIES_KEY, boundaries);
    set({ boundaries });
  },

  deleteBoundary: (id) => {
    const boundaries = get().boundaries.filter((b) => b.id !== id);
    setStorage(BOUNDARIES_KEY, boundaries);
    set({ boundaries });
  },

  addContact: (contactData) => {
    const newContact: NetworkContact = {
      id: `contact_${Date.now().toString(36)}`,
      ...contactData,
      createdAt: new Date().toISOString(),
    };
    const contacts = [newContact, ...get().contacts];
    setStorage(CONTACTS_KEY, contacts);
    set({ contacts });
  },

  updateContact: (id, updates) => {
    const contacts = get().contacts.map((c) => (c.id === id ? { ...c, ...updates } : c));
    setStorage(CONTACTS_KEY, contacts);
    set({ contacts });
  },

  deleteContact: (id) => {
    const contacts = get().contacts.filter((c) => c.id !== id);
    setStorage(CONTACTS_KEY, contacts);
    set({ contacts });
  },
}));
