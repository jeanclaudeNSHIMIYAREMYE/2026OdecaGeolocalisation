<?php

namespace Tests\Feature;

use App\Models\Colline;
use App\Models\Commune;
use App\Models\Menage;
use App\Models\Province;
use App\Models\User;
use App\Models\Zone;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SuperviseurCommunalAffectationsTest extends TestCase
{
    use RefreshDatabase;

    public function test_national_supervisor_can_assign_hills_from_different_provinces(): void
    {
        $superviseurNational = User::factory()->create([
            'role' => 'superviseur_national',
            'actif' => true,
        ]);
        $provinceA = Province::create(['code' => 'PA', 'nom' => 'Province A']);
        $provinceB = Province::create(['code' => 'PB', 'nom' => 'Province B']);
        $communeA = Commune::create(['province_id' => $provinceA->id, 'nom' => 'Commune A']);
        $communeB = Commune::create(['province_id' => $provinceB->id, 'nom' => 'Commune B']);
        $collineA = $this->creerColline($communeA, 'Colline A');
        $collineB = $this->creerColline($communeB, 'Colline B');

        $response = $this->actingAs($superviseurNational)->post(route('utilisateurs.store'), [
            'name' => 'Superviseur communal',
            'email' => 'communal@example.com',
            'role' => 'superviseur_communal',
            'collines_ids' => [$collineA->id, $collineB->id],
            'password' => 'password123',
        ]);

        $response->assertRedirect(route('utilisateurs.index'));
        $utilisateur = User::where('email', 'communal@example.com')->firstOrFail();
        $this->assertNull($utilisateur->province_id);
        $this->assertSame(
            [$communeA->id, $communeB->id],
            $utilisateur->communes()->orderBy('communes.id')->pluck('communes.id')->all(),
        );
        $collinesAttribuees = $utilisateur->collinesIds();
        sort($collinesAttribuees);
        $this->assertSame([$collineA->id, $collineB->id], $collinesAttribuees);

        $superviseurProvincial = User::factory()->create([
            'role' => 'superviseur_provincial',
            'province_id' => $provinceA->id,
            'actif' => true,
        ]);
        $this->assertTrue(
            User::visiblePour($superviseurProvincial)->whereKey($utilisateur->id)->exists(),
        );
    }

    public function test_hills_from_the_same_province_keep_their_province_scope(): void
    {
        $superviseurNational = User::factory()->create([
            'role' => 'superviseur_national',
            'actif' => true,
        ]);
        $province = Province::create(['code' => 'PA', 'nom' => 'Province A']);
        $communeA = Commune::create(['province_id' => $province->id, 'nom' => 'Commune A']);
        $communeB = Commune::create(['province_id' => $province->id, 'nom' => 'Commune B']);
        $collineA = $this->creerColline($communeA, 'Colline A');
        $collineB = $this->creerColline($communeB, 'Colline B');

        $this->actingAs($superviseurNational)->post(route('utilisateurs.store'), [
            'name' => 'Superviseur communal',
            'email' => 'communal@example.com',
            'role' => 'superviseur_communal',
            'collines_ids' => [$collineA->id, $collineB->id],
            'password' => 'password123',
        ])->assertRedirect(route('utilisateurs.index'));

        $this->assertDatabaseHas('users', [
            'email' => 'communal@example.com',
            'province_id' => $province->id,
            'commune_id' => $communeA->id,
        ]);
    }

    public function test_provincial_supervisor_cannot_assign_a_hill_from_another_province(): void
    {
        $provinceA = Province::create(['code' => 'PA', 'nom' => 'Province A']);
        $provinceB = Province::create(['code' => 'PB', 'nom' => 'Province B']);
        $commune = Commune::create(['province_id' => $provinceB->id, 'nom' => 'Commune B']);
        $colline = $this->creerColline($commune, 'Colline B');
        $superviseurProvincial = User::factory()->create([
            'role' => 'superviseur_provincial',
            'province_id' => $provinceA->id,
            'actif' => true,
        ]);

        $response = $this->actingAs($superviseurProvincial)->post(route('utilisateurs.store'), [
            'name' => 'Superviseur communal',
            'email' => 'communal@example.com',
            'role' => 'superviseur_communal',
            'collines_ids' => [$colline->id],
            'password' => 'password123',
        ]);

        $response->assertSessionHasErrors('collines_ids');
        $this->assertDatabaseMissing('users', ['email' => 'communal@example.com']);
    }

    public function test_communal_supervisor_sees_only_accounts_and_households_in_assigned_hills(): void
    {
        $superviseurNational = User::factory()->create([
            'role' => 'superviseur_national',
            'actif' => true,
        ]);
        $province = Province::create(['code' => 'PA', 'nom' => 'Province A']);
        $commune = Commune::create(['province_id' => $province->id, 'nom' => 'Commune A']);
        $hills = [
            $this->creerColline($commune, 'Colline affectée'),
            $this->creerColline($commune, 'Colline non affectée'),
        ];

        $this->actingAs($superviseurNational)->post(route('utilisateurs.store'), [
            'name' => 'Superviseur communal',
            'email' => 'communal@example.com',
            'role' => 'superviseur_communal',
            'collines_ids' => [$hills[0]->id],
            'password' => 'password123',
        ])->assertRedirect(route('utilisateurs.index'));

        $superviseurCommunal = User::where('email', 'communal@example.com')->firstOrFail();
        $enqueteurAffecte = User::factory()->create([
            'role' => 'enqueteur',
            'actif' => true,
        ]);
        $enqueteurAffecte->collines()->attach($hills[0]->id);
        $enqueteurExterieur = User::factory()->create([
            'role' => 'enqueteur',
            'actif' => true,
        ]);
        $enqueteurExterieur->collines()->attach($hills[1]->id);

        $menageAffecte = Menage::withoutGlobalScopes()->create([
            'code_menage' => 'MEN-001',
            'colline_id' => $hills[0]->id,
        ]);
        Menage::withoutGlobalScopes()->create([
            'code_menage' => 'MEN-002',
            'colline_id' => $hills[1]->id,
        ]);

        $this->assertTrue(User::visiblePour($superviseurCommunal)->whereKey($enqueteurAffecte->id)->exists());
        $this->assertFalse(User::visiblePour($superviseurCommunal)->whereKey($enqueteurExterieur->id)->exists());
        $this->assertSame(
            [$menageAffecte->id],
            Menage::withoutGlobalScopes()->visiblePour($superviseurCommunal)->pluck('id')->all(),
        );

        $this->actingAs($superviseurCommunal)->post(route('utilisateurs.store'), [
            'name' => 'Enquêteur autorisé',
            'email' => 'enqueteur-autorise@example.com',
            'role' => 'enqueteur',
            'collines_ids' => [$hills[0]->id],
            'password' => 'password123',
        ])->assertRedirect(route('utilisateurs.index'));

        $this->actingAs($superviseurCommunal)->post(route('utilisateurs.store'), [
            'name' => 'Enquêteur hors périmètre',
            'email' => 'enqueteur-hors-perimetre@example.com',
            'role' => 'enqueteur',
            'collines_ids' => [$hills[1]->id],
            'password' => 'password123',
        ])->assertSessionHasErrors('collines_ids');
    }

    private function creerColline(Commune $commune, string $nom): Colline
    {
        $zone = Zone::create([
            'commune_id' => $commune->id,
            'nom' => "Zone {$nom}",
        ]);

        return Colline::create([
            'zone_id' => $zone->id,
            'nom' => $nom,
        ]);
    }
}
