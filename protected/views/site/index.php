<?php $this->pageTitle=Yii::app()->name; ?>
<div class="colLeft">
<h2>Bienvenue sur <?php echo CHtml::encode(Yii::app()->name); ?>, tout pour danser le rock'n roll !</h2>

	<span class="alert i_valid">
		Et voilà ! La nouvelle version est en ligne, en espérant qu'elle vous plaise.<br/>
		Si vous avez une question, une réclamation, une proposition, un problème ? écrivez moi : <a href=mailto:passefinder@gmail.com target="_blank">passe-finder@gmail.com</a>
	</span><br />

	<p>Ici, vous pourrez consulter les positions, passes et enchaînements de rock'n roll, mais aussi créer vos propres enchaînements ou proposer vos passes. </p> 
	<p>Pour les écoles, c'est également un moyen simple de mettre en ligne les cours que vous avez et les enchainements que vous créez
	<p>Ce site n'a pas pour vocation de vous apprendre le rock si vous ne le connaissez pas. Il s'agit surtout d'un outil en plus des cours pour vous permettre de retrouver certaines informations, pour tester des enchaînements, pour partager votre passion. </p>


<?php if (Yii::app()->user->isGuest){ ?>
	<p> Vous n'êtes pas connecté. En vous connectant, vous pourrez bénéficier de nombreuses actions possibles :
		<ul>
			<li>Mettre des passes, enchainements, vidéos en favoris.</li>
			<li>Vous inscrire à des cours et suivre leurs enchainements et vidéos.</li>
			<li>Créer et partager vos propres positions, passes et enchainements.</li>
		</ul>
	</p>

<?php } else { ?>
	Vos inscriptions récentes
	<?php
		$data = new CActiveDataProvider('LogInscription', 
			array(
				'criteria'=>array(
					'condition'=>'user_id='.Yii::app()->user->id,
					'order'=>'id DESC',
					'limit'=>5
				),
				'pagination' => array('pageSize' => 5,),
				'totalItemCount' => 5,
			)
		);
		$this->widget('zii.widgets.grid.CGridView', array(
			'id'=>'subcribes',
			'dataProvider'=>$data,
			'template'=>"{items}",	
			'columns'=>array(
				'date',
				array(
					'class'=>'CLinkColumn',
					'labelExpression'=>'$data->lesson->name',
					'urlExpression'=>'Yii::app()->createUrl("lesson/view",array("id"=>$data->lesson_id))',
					'header'=>'Cours'
				),
				array(            
					'name'=>'commentaire',
					'value'=>array($this,'getUserComment'), 
				),
			),
			'enablePagination'=>false,
			'enableSorting'=>false
		));
	} 
	
		?>
Liste des derniers enchainements de vos cours :
<?php
	$data = new CActiveDataProvider('Enchainement', 
		array(
			'criteria'=>array(
			'join' => 'join user_lesson on user_lesson.lesson_id=t.lesson_id',	
			'condition'=>'user_lesson.user_id='.Yii::app()->user->id,
				'order'=>'dateEvent DESC',
				'limit'=>15
			),
			'pagination' => array('pageSize' => 5),
			'totalItemCount' => 15,
		)
	);

	$this->widget('zii.widgets.grid.CGridView', array(
		'id'=>'lesson_enchainements',
		'dataProvider'=>$data,
		'template'=>"{items}\n{pager}",	
		'columns'=>array(
			'dateEvent',
			array(            
				'class'=>'CLinkColumn',
				'header'=>'Enchainement',
				'labelExpression'=>'substr($data->name,0,min(strlen($data->name),50)).\'...\'',
				'urlExpression'=>'Yii::app()->createUrl("enchainement/view",array("id"=>$data->id))',
			),
			array(            
				'name'=>'Cours',
				'value'=>'\'(\'.$data->lesson->school->name.\') \'.$data->lesson->name', 
			),
			array(            
				'name'=>'Commentaire',
				'value'=>'substr($data->commentaire,0,min(strlen($data->commentaire),50)).\'...\'', 
			)
		)
	));
?>
</div>
<div class="colRight">
	<div class="box_01">
	<h3>Derniers ajouts </h3>
		<ul class="newsfeed">
		<?php
			//$positions = new CSqlDataProvider('select dateCreate, ("position") as type, id, name from position p where pending=0', array());
			$passes = Yii::app()->db->createCommand(
				'select dateMaj, dateCreate, ("position") as type, id, name from position where pending=0'
				.' union select dateMaj, dateCreate, ("passe") as type, id, name from passe where pending=0'
				.' union select dateMaj, dateCreate, ("enchainement") as type, id, name from enchainement where published=1 and private=0'
				.' union select dateMaj, dateCreate, ("école") as type, id, name from school'
				.' union select v.dateMaj as dateMaj, v.dateCreate as dateCreate, ("vidéo") as type, v.id as id, enchainement.name as name from video v inner join enchainement on enchainement.id=v.enchainement_id  where published=1 and private=0'
				.' order by dateMaj DESC limit 6'
			)->query();			
			$passes->bindColumn(1,$dateMaj);
			$passes->bindColumn(2,$dateCreate);
			$passes->bindColumn(3,$type);
			$passes->bindColumn(4,$id);
			$passes->bindColumn(5,$name);
			while($passes->read()!==false)	{
				if ($dateCreate != $dateMaj){
					$action="Mise à jour";
				} else {
					if ($type == "position" or $type == "passe" or $type == "vidéo" or $type == "école")
						$action="Nouvelle";
					else
						$action = "Nouvel";
				}
				$url = $type;
				if ($type == "école") $url = "school";
				else if ($type == "vidéo") $url = "video";
				echo '<li><span>'.$dateMaj." </span>- ".$action." ".$type." : <br /> ".CHtml::link(CHtml::encode($name), array($url.'/view/'.$id)).'</li>';
			}
		?>
		</ul>
	</div>
	<div class="box_01">
	<h3>Statistiques </h3>
		<ul>
			<li>Nombre de positions :<?php echo Position::model()->count();?></li>
			<li>Nombre d'alternatives :<?php echo Alternative::model()->count();?></li>
			<li>Nombre de passes :<?php echo Passe::model()->count();?></li>
			<li>Nombre de noms personnalises :<?php echo PersonnalizePasse::model()->count();?></li>
			<li>Nombre d'enchainements :<?php echo Enchainement::model()->count();?></li>
			<li>Nombre de vidéos :<?php echo Video::model()->count();?></li>
			<li>Nombre d'écoles :<?php echo School::model()->count();?></li>
			<li>Nombre de cours :<?php echo Lesson::model()->count();?></li>
			<li>Nombre d'inscrits :<?php echo User::model()->count();?></li>
		</ul>

	</div>
</div>
<div class="clear"></div>