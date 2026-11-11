<?php

namespace Tests\Unit;

use App\Models\User;
use PHPUnit\Framework\TestCase;

class UserAccountClassificationTest extends TestCase
{
    public function test_uic_students_and_teachers_have_distinct_labels(): void
    {
        $student = new User([
            'email' => 'student@uic.edu.ph',
            'uic_member_type' => 'student',
        ]);
        $teacher = new User([
            'email' => 'teacher@uic.edu.ph',
            'uic_member_type' => 'teacher',
        ]);

        $this->assertSame('UIC Student', $student->account_type_label);
        $this->assertSame('UIC Teacher', $teacher->account_type_label);
    }

    public function test_uic_member_without_a_recorded_classification_is_not_guessed(): void
    {
        $user = new User(['email' => 'member@uic.edu.ph']);

        $this->assertSame('UIC Member — classification needed', $user->account_type_label);
    }

    public function test_non_uic_email_is_classified_as_outsider(): void
    {
        $user = new User([
            'email' => 'visitor@example.com',
            'uic_member_type' => 'student',
        ]);

        $this->assertSame('Outsider', $user->account_type_label);
    }
}
