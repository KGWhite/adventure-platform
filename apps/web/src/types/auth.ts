export type Role = 'USER' | 'ADMIN';

export type CredentialType = 'QRCODE' | 'RFID' | 'NFC';

export interface Rank {
  id: string;
  code: string;
  name: string;
  order: number;
  promotionThreshold: number;
}

export interface Credential {
  id: string;
  adventurerId: string;
  type: CredentialType;
  value: string;
  enabled: boolean;
  createdAt: string;
}

export interface AdventurerProfile {
  id: string;
  userId: string;
  displayName: string;
  currentRankId: string;
  currentRank?: Rank;
  credentials?: Credential[];
  createdAt?: string;
  updatedAt?: string;
  user?: {
    id: string;
    username: string;
    role: Role;
    createdAt?: string;
  };
}


export interface User {
  id: string;
  username: string;
  role: Role;
  adventurerProfile?: AdventurerProfile;
}

export interface AuthResponse {
  accessToken: string;
  user: User;
}
