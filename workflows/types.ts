export type District = {
    id: number;
    name: string;
    city: string;
    state: string;
};

export type Contact = {
    id: number;
    name: string;
    title: string | null;
    email: string | null;
    phone: string | null;
    linkedinUrl: string | null;
};
