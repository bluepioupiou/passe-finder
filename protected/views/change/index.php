<?php
$this->breadcrumbs=array(
	'Changements',
);

$this->menu=array(
	array('label'=>'Create Change', 'url'=>array('create')),
	array('label'=>'Manage Change', 'url'=>array('admin')),
);
?>

<h1>Changements</h1>
<p>
Vous trouverez listé ici tous les changements réalisés sur le site. Comme quoi ça bouge !
</p>
<?php 
	$dataProvider->sort->defaultOrder='Date DESC';
	$this->widget('zii.widgets.CListView', array(
	'dataProvider'=>$dataProvider,
	'template'=>"{summary}{pager}\n{items}\n{pager}",	
	'itemView'=>'_view',
)); ?>
