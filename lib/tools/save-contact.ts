import { tool } from "ai";
import { z } from "zod";

export const saveContact = tool({
    description: "Save contact",
  
    inputSchema: z.object({
        districtId: z.string(),
        name: z.string(),
        email: z.string(),
        title: z.string(),
    }),
  
    execute: async (contact) => {
        //await db.insert(contact);
    
        console.log(`Contact saved: ${contact.name}, ${contact.email}, ${contact.title} for district ${contact.districtId}`);
        return { success: true };
    },
  });