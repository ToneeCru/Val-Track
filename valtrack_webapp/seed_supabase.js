import { createClient } from '@supabase/supabase-js';

// Hardcoded credentials for this script
const SUPABASE_URL = 'https://filcwwyqckpvhfntllso.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZpbGN3d3lxY2twdmhmbnRsbHNvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk3NDA3MTEsImV4cCI6MjA4NTMxNjcxMX0.819VzXl7Qw29s3_45BucVM7PPnR8-RjM8yttOA_iu5g';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function seedData() {
    console.log('Starting seed process (ESM) for Multi-Branch Architecture...');

    // 1. Branches
    console.log('Seeding Branches...');
    const branches = [
        { name: 'ValACE Malinta' },
        { name: 'ValACE Marulas' },
        { name: 'ValACE Gen. T. De Leon' },
        { name: 'ValACE Mapulang Lupa' }
    ];

    const { data: createdBranches, error: branchError } = await supabase
        .from('branches')
        .upsert(branches, { onConflict: 'name' })
        .select();

    if (branchError) {
        console.error('Error seeding branches:', branchError.message);
        return;
    }
    console.log('Branches seeded successfully:', createdBranches.length);

    // 2. Floors, Areas within Branches
    // We will seed data for ALL branches to allow testing switching.
    for (const branch of createdBranches) {
        console.log(`Seeding structure for branch: ${branch.name}...`);

        // Create 3 Floors for each branch
        for (let f = 1; f <= 3; f++) {
            // Upsert Floor
            const { data: floorData, error: floorError } = await supabase
                .from('floors')
                .upsert({
                    branch_id: branch.id,
                    floor_number: f,
                    label: `Floor ${f}`
                }, { onConflict: 'branch_id, floor_number' })
                .select()
                .single();

            if (floorError) {
                console.error(`Error seeding floor ${f} for ${branch.name}:`, floorError.message);
                continue;
            }

            const floorId = floorData.id;

            // Define Areas for this floor
            const areasToCreate = [
                {
                    floor_id: floorId,
                    name: `General Area F${f}`,
                    type: 'General Library',
                    capacity: 40
                },
                {
                    floor_id: floorId,
                    name: `Reading Nook F${f}`,
                    type: 'Reading Nook',
                    capacity: 10
                }
            ];

            if (f === 1) {
                areasToCreate.push({
                    floor_id: floorId,
                    name: "Children's Area",
                    type: "Children's Area",
                    capacity: 20
                });
            }

            // Upsert Areas
            for (const area of areasToCreate) {
                const { data: createdArea, error: areaError } = await supabase
                    .from('areas')
                    .upsert(area, { onConflict: 'floor_id, name' })
                    .select()
                    .single();

                if (areaError) {
                    console.error(`Error creating area ${area.name}:`, areaError.message);
                    continue;
                }

                // Create Baggage Lockers for General Area only (mock logic)
                if (createdArea && area.type === 'General Library') {
                    const lockers = [];
                    for (let l = 1; l <= 5; l++) {
                        // Unique ID across system? Schema uses text ID. 
                        // To avoid conflict across branches, prefix with Branch Initials or Name info?
                        // Schema ID is text. Let's make it unique: "B{BranchID}-F{Floor}-L{Locker}"
                        // A bit long. Let's use Branch Name initials.
                        const initials = branch.name.split(' ').map(n => n[0]).join('');
                        lockers.push({
                            id: `${initials}-F${f}-L${l}`,
                            area_id: createdArea.id,
                            status: 'available'
                        });
                    }
                    const { error: lockerError } = await supabase
                        .from('baggage')
                        .upsert(lockers, { onConflict: 'id' });

                    if (lockerError) console.error('Error creating lockers:', lockerError.message);
                }
            }
        }
    }

    console.log('Seeding complete for all branches.');
}

seedData();
