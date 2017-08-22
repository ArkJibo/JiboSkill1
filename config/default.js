'use strict';

module.exports = {
    model: {
        db: {
            events: './db/events.db',
            reminderQueue: './db/reminderQueue.db',
            inventory: './db/inventory.db',
            patient: './db/patient.db',
            people: './db/people.db',
            media: './db/media.db',
            entertainment: './db/entertainment.db',
            voice: './db/voice.db',
            credentials: './db/credentials.db',
            emails: './db/emails.db'
        },
        testDb: {
            events: './db/test-events.db',
            reminderQueue: './db/test-reminderQueue.db',
            inventory: './db/test-inventory.db',
            patient: './db/test-patient.db',
            people: './db/test-people.db',
            media: './db/test-media.db',
            entertainment: './db/test-entertainment.db',
            voice: './db/test-voice.db',
            credentials: './db/test-credentials.db',
            emails: './db/test-emails.db'
        }
    },

    fetchReminderInterval: 1000
}
