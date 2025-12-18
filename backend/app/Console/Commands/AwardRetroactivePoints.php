<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Post;
use App\Models\User;

class AwardRetroactivePoints extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'points:retroactive';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Award retroactive points for completed errands';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Awarding retroactive points for completed errands...');

        // Get all completed posts that have a runner
        $completedPosts = Post::with('runner')
            ->where('status', 'completed')
            ->whereNotNull('runner_id')
            ->get();

        $this->info("Found {$completedPosts->count()} completed errands.");

        $pointsAwarded = 0;
        $runnersUpdated = [];

        foreach ($completedPosts as $post) {
            if ($post->runner) {
                // Award 1 point for each completed errand
                $post->runner->increment('points', 1);
                $pointsAwarded++;
                
                if (!in_array($post->runner->id, $runnersUpdated)) {
                    $runnersUpdated[] = $post->runner->id;
                }

                $this->line("✓ Awarded 1 point to {$post->runner->name} for post #{$post->id}");
            }
        }

        $this->info("Retroactive points awarded successfully!");
        $this->info("Total points awarded: {$pointsAwarded}");
        $this->info("Runners updated: " . count($runnersUpdated));

        // Show updated runner points
        if (!empty($runnersUpdated)) {
            $this->info("\nUpdated runner points:");
            $runners = User::whereIn('id', $runnersUpdated)->get();
            foreach ($runners as $runner) {
                $this->line("  {$runner->name}: {$runner->points} points");
            }
        }
    }
}
