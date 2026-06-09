export type District = {
    name: string;
    city: string;
    state: string;
    contacts?: Contact[];
    website?: string;
    existingCustomers?: Customer[];
};

export type Contact = {
    name: string;
    email: string;
    title: string;
};

export type Customer = {
    name: string;
    industry: string;
};