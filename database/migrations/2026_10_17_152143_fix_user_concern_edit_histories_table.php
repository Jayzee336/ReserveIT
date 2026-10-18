<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('user_concern_edit_histories', function (Blueprint $table) {
            $table->foreignId('user_concern_id')
                ->after('id')
                ->constrained('user_concerns')
                ->cascadeOnDelete();

            $table->date('previous_appeal_date')->nullable();
            $table->date('updated_appeal_date')->nullable();

            $table->string('previous_category')->nullable();
            $table->string('updated_category')->nullable();

            $table->text('previous_detailed_info')->nullable();
            $table->text('updated_detailed_info')->nullable();

            $table->foreignId('edited_by')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('user_concern_edit_histories', function (Blueprint $table) {
            $table->dropConstrainedForeignId('user_concern_id');
            $table->dropConstrainedForeignId('edited_by');

            $table->dropColumn([
                'previous_appeal_date',
                'updated_appeal_date',
                'previous_category',
                'updated_category',
                'previous_detailed_info',
                'updated_detailed_info',
            ]);
        });
    }
};