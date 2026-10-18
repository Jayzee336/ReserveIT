
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('user_concern_reply_histories', function (Blueprint $table) {
            $table->id();

            $table->foreignId('user_concern_id')
                ->constrained('user_concerns')
                ->cascadeOnDelete();

            $table->text('previous_reply');
            $table->text('updated_reply');

            // The administrator who edited the reply.
            $table->foreignId('edited_by')
                ->constrained('users')
                ->restrictOnDelete();

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('user_concern_reply_histories');
    }
};